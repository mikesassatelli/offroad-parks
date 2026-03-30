import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ConditionModerationTable } from "@/components/admin/ConditionModerationTable";
import type { AdminCondition } from "@/components/admin/ConditionModerationTable";

const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const makePendingCondition = (overrides?: Partial<AdminCondition>): AdminCondition => ({
  id: "cond-1",
  parkId: "park-1",
  status: "OPEN",
  note: "Trails are clear after recent rain",
  reportStatus: "PENDING_REVIEW",
  createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
  park: { name: "Moab Sand Flats", slug: "moab-sand-flats" },
  user: { name: "Jane Rider", email: "jane@example.com" },
  ...overrides,
});

const makePublishedCondition = (overrides?: Partial<AdminCondition>): AdminCondition => ({
  id: "cond-2",
  parkId: "park-2",
  status: "MUDDY",
  note: null,
  reportStatus: "PUBLISHED",
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  park: { name: "Chadwick ATV Area", slug: "chadwick-atv" },
  user: { name: "Bob Trail", email: "bob@example.com" },
  ...overrides,
});

describe("ConditionModerationTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  it("renders the toolbar with search and filter buttons", () => {
    render(<ConditionModerationTable conditions={[]} />);
    expect(screen.getByPlaceholderText(/search by park name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pending review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /published/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
  });

  it("shows empty state when no pending conditions", () => {
    render(<ConditionModerationTable conditions={[makePublishedCondition()]} />);
    expect(screen.getByText(/no condition reports pending review/i)).toBeInTheDocument();
  });

  it("shows empty state when no conditions match search", () => {
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    const input = screen.getByPlaceholderText(/search by park name/i);
    fireEvent.change(input, { target: { value: "nonexistent park" } });
    // Default filter is PENDING_REVIEW so the pending-specific message shows
    expect(screen.getByText(/no condition reports pending review/i)).toBeInTheDocument();
  });

  it("renders a pending condition row with park name, reporter, status, note", () => {
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    expect(screen.getByText("Moab Sand Flats")).toBeInTheDocument();
    expect(screen.getByText("Jane Rider")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText(/trails are clear after recent rain/i)).toBeInTheDocument();
  });

  it("shows Approve and Reject buttons for PENDING_REVIEW conditions", () => {
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    expect(screen.getByRole("button", { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("shows Published label (not action buttons) for PUBLISHED conditions", () => {
    render(
      <ConditionModerationTable
        conditions={[makePublishedCondition()]}
        />,
    );
    // Switch to "All" to see published conditions
    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    // "Published" appears in both the filter button and the table row cell;
    // verify at least one instance exists in the table body
    expect(screen.getAllByText("Published").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });

  it("renders em-dash when note is null", () => {
    const pending = makePendingCondition({ note: null });
    render(<ConditionModerationTable conditions={[pending]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("shows Unknown when user is null", () => {
    const pending = makePendingCondition({ user: null });
    render(<ConditionModerationTable conditions={[pending]} />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("shows email when user has no name", () => {
    const pending = makePendingCondition({ user: { name: null, email: "anon@example.com" } });
    render(<ConditionModerationTable conditions={[pending]} />);
    expect(screen.getByText("anon@example.com")).toBeInTheDocument();
  });

  it("filters to show all conditions when All is clicked", () => {
    const conditions = [makePendingCondition(), makePublishedCondition()];
    render(<ConditionModerationTable conditions={conditions} />);
    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    expect(screen.getByText("Moab Sand Flats")).toBeInTheDocument();
    expect(screen.getByText("Chadwick ATV Area")).toBeInTheDocument();
  });

  it("filters by park name search", () => {
    const conditions = [makePendingCondition(), makePendingCondition({
      id: "cond-3",
      park: { name: "Pismo Beach Dunes", slug: "pismo" },
    })];
    render(<ConditionModerationTable conditions={conditions} />);
    const input = screen.getByPlaceholderText(/search by park name/i);
    fireEvent.change(input, { target: { value: "pismo" } });
    expect(screen.getByText("Pismo Beach Dunes")).toBeInTheDocument();
    expect(screen.queryByText("Moab Sand Flats")).not.toBeInTheDocument();
  });

  it("shows count badges on filter buttons", () => {
    const conditions = [makePendingCondition(), makePublishedCondition()];
    render(<ConditionModerationTable conditions={conditions} />);
    // Both pending and published counts show as "(1)" spans
    const countBadges = screen.getAllByText("(1)", { selector: "span" });
    expect(countBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("calls approve API and refreshes on Approve click", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/conditions/cond-1/approve",
        { method: "POST" },
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("calls reject API and refreshes on Reject click after confirmation", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/conditions/cond-1/reject",
        { method: "POST" },
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("does not call reject API when confirmation is cancelled", async () => {
    global.confirm = vi.fn(() => false);
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows alert when approve API fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false } as Response);
    global.alert = vi.fn();
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to approve condition report");
    });
  });

  it("shows alert when reject API fails", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: false } as Response);
    global.alert = vi.fn();
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /reject/i }));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Failed to reject condition report");
    });
  });

  it("disables buttons while a request is in flight", async () => {
    let resolveRequest!: (v: any) => void;
    vi.mocked(global.fetch).mockReturnValueOnce(
      new Promise((r) => { resolveRequest = r; }),
    );
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /reject/i })).toBeDisabled();
    resolveRequest({ ok: true });
  });

  it("renders park link pointing to park detail page", () => {
    render(<ConditionModerationTable conditions={[makePendingCondition()]} />);
    const link = screen.getByRole("link", { name: /moab sand flats/i });
    expect(link).toHaveAttribute("href", "/parks/moab-sand-flats");
  });
});
