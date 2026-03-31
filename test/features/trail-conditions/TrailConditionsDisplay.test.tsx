import { render, screen, waitFor } from "@testing-library/react";
import { TrailConditionsDisplay } from "@/features/trail-conditions/TrailConditionsDisplay";
import { vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/features/trail-conditions/TrailConditionForm", () => ({
  TrailConditionForm: ({ parkSlug }: { parkSlug: string }) => (
    <div data-testid="trail-condition-form" data-slug={parkSlug}>
      Trail Condition Form
    </div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: any) => (
    <span data-testid="badge" className={className}>{children}</span>
  ),
}));

vi.mock("lucide-react", () => ({
  CloudSun: ({ className }: any) => (
    <svg data-icon="cloud-sun" className={className}><title>Cloud Sun</title></svg>
  ),
  ShieldCheck: () => <span data-testid="shield-check" />,
  Pin: () => <span data-testid="pin" />,
  Trash2: () => <span data-testid="trash" />,
}));

import { useSession } from "next-auth/react";
import { CONDITION_STALE_AFTER_MS } from "@/lib/trail-conditions";

const freshDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
const staleDate = new Date(Date.now() - CONDITION_STALE_AFTER_MS - 1000).toISOString(); // past threshold

const mockConditions = [
  {
    id: "c1",
    userId: "other-user",
    status: "OPEN",
    note: null,
    createdAt: freshDate,
    reportStatus: "PUBLISHED",
    isOperatorPost: false,
    pinnedUntil: null,
    user: { id: "other-user", name: "Alice" },
  },
];

describe("TrailConditionsDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render loading state initially", () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    render(<TrailConditionsDisplay parkSlug="test-park" />);
    expect(screen.getByText(/loading conditions/i)).toBeInTheDocument();
  });

  it("should render 'no recent reports' when no conditions", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText(/no recent condition reports/i)).toBeInTheDocument();
    });
  });

  it("should render the most recent condition status", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: mockConditions }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });

  it("should show reporter name when present", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: mockConditions }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText(/by Alice/)).toBeInTheDocument();
    });
  });

  it("should show note when present", async () => {
    const conditionsWithNote = [
      { ...mockConditions[0], note: "Muddy at the lower trailhead" },
    ];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: conditionsWithNote }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText(/Muddy at the lower trailhead/)).toBeInTheDocument();
    });
  });

  it("should show sign-in prompt when not authenticated", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText("Sign in")).toBeInTheDocument();
    });
    expect(screen.getByText(/to report trail conditions/)).toBeInTheDocument();
  });

  it("should show 'report condition' button when authenticated", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "user-1", name: "Bob" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText(/report condition/i)).toBeInTheDocument();
    });
  });

  it("should not show stale conditions", async () => {
    const staleCondition = { ...mockConditions[0], createdAt: staleDate };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [staleCondition] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.queryByText("Open")).not.toBeInTheDocument();
      expect(screen.getByText(/no recent condition reports/i)).toBeInTheDocument();
    });
  });

  it("should handle API failure gracefully (silent error)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText(/no recent condition reports/i)).toBeInTheDocument();
    });
  });

  it("should show multiple recent conditions", async () => {
    const multipleConditions = [
      { ...mockConditions[0], id: "c1", status: "OPEN" },
      { ...mockConditions[0], id: "c2", status: "MUDDY" },
      { ...mockConditions[0], id: "c3", status: "WET" },
    ];
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: multipleConditions }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText(/recent reports/i)).toBeInTheDocument();
    });
  });

  it("hides 'report condition' button when user has an active report", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "user-1", name: "Bob" } },
    });
    const myCondition = { ...mockConditions[0], id: "c1", userId: "user-1", user: { id: "user-1", name: "Bob" } };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [myCondition] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
    expect(screen.queryByText(/report condition/i)).not.toBeInTheDocument();
  });

  it("shows delete button on own report and not on others'", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "user-1", name: "Bob" } },
    });
    const myCondition = { ...mockConditions[0], id: "c1", userId: "user-1", user: { id: "user-1", name: "Bob" } };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [myCondition] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByLabelText("Delete my report")).toBeInTheDocument();
    });
  });

  it("does not show delete button on another user's report", async () => {
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: "user-1", name: "Bob" } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: mockConditions }), // userId: "other-user"
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
    expect(screen.queryByLabelText("Delete my report")).not.toBeInTheDocument();
  });

  it("prioritises operator post over community report in featured slot", async () => {
    const operatorPost = {
      ...mockConditions[0],
      id: "op-1",
      userId: "operator-user",
      status: "CLOSED",
      isOperatorPost: true,
      user: { id: "operator-user", name: "Park Operator" },
    };
    const communityPost = { ...mockConditions[0], id: "c2", status: "OPEN", createdAt: new Date(Date.now() - 500).toISOString() };
    // communityPost is newer but operatorPost should be featured
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ conditions: [communityPost, operatorPost] }),
    });

    render(<TrailConditionsDisplay parkSlug="test-park" />);

    await waitFor(() => {
      expect(screen.getByTestId("shield-check")).toBeInTheDocument();
    });
  });
});
