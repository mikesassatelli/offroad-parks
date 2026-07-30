import { render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { TrailStatusBar } from "@/features/trail-conditions/TrailStatusBar";

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

const freshDate = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

function mockConditions(conditions: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ conditions }),
  }) as unknown as typeof fetch;
}

describe("TrailStatusBar", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows a neutral 'no reports' state with a Report link when there are none", async () => {
    mockConditions([]);
    render(<TrailStatusBar parkSlug="test-park" />);

    await waitFor(() =>
      expect(
        screen.getByText(/no recent trail condition reports/i),
      ).toBeInTheDocument(),
    );
    const link = screen.getByRole("link", { name: /report condition/i });
    expect(link).toHaveAttribute("href", "#trail-conditions");
  });

  it("shows a color-coded status with reporter and note for the featured condition", async () => {
    mockConditions([
      {
        id: "c1",
        parkId: "p1",
        userId: "u1",
        status: "MUDDY",
        note: "Back section is a swamp",
        reportStatus: "PUBLISHED",
        isOperatorPost: false,
        pinnedUntil: null,
        createdAt: freshDate,
        user: { id: "u1", name: "Alice", image: null },
      },
    ]);
    render(<TrailStatusBar parkSlug="test-park" />);

    await waitFor(() =>
      expect(screen.getByText(/trail status: muddy/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/by alice/i)).toBeInTheDocument();
    expect(screen.getByText(/back section is a swamp/i)).toBeInTheDocument();
  });

  it("credits the operator for an operator post", async () => {
    mockConditions([
      {
        id: "c2",
        parkId: "p1",
        userId: "op1",
        status: "CLOSED",
        note: null,
        reportStatus: "PUBLISHED",
        isOperatorPost: true,
        pinnedUntil: null,
        createdAt: freshDate,
        user: { id: "op1", name: "Park Op", image: null },
      },
    ]);
    render(<TrailStatusBar parkSlug="test-park" />);

    await waitFor(() =>
      expect(screen.getByText(/trail status: closed/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/by the operator/i)).toBeInTheDocument();
  });

  it("renders nothing on a failed fetch (non-critical)", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("network")) as unknown as typeof fetch;
    const { container } = render(<TrailStatusBar parkSlug="test-park" />);

    // After the rejected fetch resolves, it falls back to the neutral state.
    await waitFor(() =>
      expect(
        screen.getByText(/no recent trail condition reports/i),
      ).toBeInTheDocument(),
    );
    expect(container).not.toBeEmptyDOMElement();
  });
});
