import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ParkClaimCTA } from "@/features/parks/detail/components/ParkClaimCTA";
import { vi } from "vitest";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, type, disabled, className }: any) => (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  Building2: () => <span data-testid="building-icon" />,
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
  CheckCircle: () => <span data-testid="check-circle" />,
}));

describe("ParkClaimCTA", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("renders a managed-by notice when hasOperator is true", () => {
    render(
      <ParkClaimCTA
        parkSlug="test-park"
        isLoggedIn={true}
        hasOperator={true}
        operatorName="Desert Riders LLC"
      />
    );
    expect(screen.getByText(/managed by/i)).toBeInTheDocument();
    expect(screen.getByText("Desert Riders LLC")).toBeInTheDocument();
  });

  it("renders the CTA card when park has no operator", () => {
    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={false} hasOperator={false} />
    );
    expect(screen.getByText("Own or manage this park?")).toBeInTheDocument();
  });

  it("shows sign-in link when not logged in", () => {
    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={false} />
    );
    const signInLink = screen.getByText("Sign in");
    expect(signInLink).toBeInTheDocument();
    expect(signInLink.closest("a")).toHaveAttribute("href", "/api/auth/signin");
    expect(screen.getByText(/to claim this park/)).toBeInTheDocument();
  });

  it("shows claim button when logged in", () => {
    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );
    expect(screen.getByText("Claim this park")).toBeInTheDocument();
    expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();
  });

  it("expands form when claim button is clicked", () => {
    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );
    fireEvent.click(screen.getByText("Claim this park"));
    expect(screen.getByTestId("claim-form")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("jane@example.com")).toBeInTheDocument();
  });

  it("collapses form when button is clicked again", () => {
    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );
    fireEvent.click(screen.getByText("Claim this park"));
    expect(screen.getByTestId("claim-form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Claim this park"));
    expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();
  });

  it("shows success state after successful submission", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, claim: { id: "claim-1", status: "PENDING" } }),
    });

    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );

    fireEvent.click(screen.getByText("Claim this park"));
    fireEvent.change(screen.getByPlaceholderText(/Iowa DNR/), {
      target: { value: "Desert Riders LLC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(screen.getByText("Submit claim"));

    await waitFor(() => {
      expect(screen.getByText("Claim submitted!")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("claim-form")).not.toBeInTheDocument();
  });

  it("shows error message on failed submission", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "You have already submitted a claim for this park" }),
    });

    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );

    fireEvent.click(screen.getByText("Claim this park"));
    fireEvent.change(screen.getByPlaceholderText(/Iowa DNR/), {
      target: { value: "Desert Riders LLC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(screen.getByText("Submit claim"));

    await waitFor(() => {
      expect(
        screen.getByText("You have already submitted a claim for this park")
      ).toBeInTheDocument();
    });
  });

  it("shows generic error message on network failure", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );

    fireEvent.click(screen.getByText("Claim this park"));
    fireEvent.change(screen.getByPlaceholderText(/Iowa DNR/), {
      target: { value: "Desert Riders LLC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(screen.getByText("Submit claim"));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to submit claim. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("submits correct payload to the claim API", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, claim: { id: "claim-1", status: "PENDING" } }),
    });

    render(
      <ParkClaimCTA parkSlug="test-park" isLoggedIn={true} />
    );

    fireEvent.click(screen.getByText("Claim this park"));
    fireEvent.change(screen.getByPlaceholderText(/Iowa DNR/), {
      target: { value: "Desert Riders LLC" },
    });
    fireEvent.change(screen.getByPlaceholderText("Jane Smith"), {
      target: { value: "Jane Smith" },
    });
    fireEvent.change(screen.getByPlaceholderText("jane@example.com"), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("(555) 555-5555"), {
      target: { value: "(555) 555-1234" },
    });
    fireEvent.click(screen.getByText("Submit claim"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/parks/test-park/claim",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("Desert Riders LLC"),
        })
      );
    });
  });
});
