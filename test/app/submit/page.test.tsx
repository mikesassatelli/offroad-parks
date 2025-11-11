import { render, screen } from "@testing-library/react";
import SubmitParkPage from "@/app/submit/page";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/forms/ParkSubmissionForm", () => ({
  ParkSubmissionForm: () => (
    <div data-testid="park-submission-form">Park Submission Form</div>
  ),
}));

describe("SubmitParkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to signin when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(SubmitParkPage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/signin?callbackUrl=/submit",
    );
  });

  it("should render submit page for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe", email: "john@example.com" },
    } as any);

    const component = await SubmitParkPage();
    render(component);

    expect(screen.getByText("Submit a Park")).toBeInTheDocument();
  });

  it("should render park submission form", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const component = await SubmitParkPage();
    render(component);

    expect(screen.getByTestId("park-submission-form")).toBeInTheDocument();
  });

  it("should render header with logo link", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const component = await SubmitParkPage();
    render(component);

    const logoLink = screen.getByRole("link", { name: /utv parks/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("should display beta badge", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const component = await SubmitParkPage();
    render(component);

    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("should display description about review process", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const component = await SubmitParkPage();
    render(component);

    expect(
      screen.getByText(/your submission will be reviewed by our team/i),
    ).toBeInTheDocument();
  });

  it("should have proper layout structure", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const { container } = render(await SubmitParkPage());

    expect(container.querySelector("header")).toBeInTheDocument();
    expect(container.querySelector("main")).toBeInTheDocument();
  });
});
