import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ParkDiscoveryTable } from "@/components/admin/ParkDiscoveryTable";
import type { ParkCandidateSummary } from "@/lib/types";

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

const makeCandidate = (
  overrides?: Partial<ParkCandidateSummary>
): ParkCandidateSummary => ({
  id: "cand-1",
  name: "Sand Hollow OHV",
  state: "UT",
  city: "Hurricane",
  estimatedLat: 37.12,
  estimatedLng: -113.37,
  sourceUrl: "https://example.com/sand-hollow",
  status: "PENDING",
  rejectedReason: null,
  seededParkId: null,
  createdAt: "2026-04-01T00:00:00Z",
  ...overrides,
});

describe("ParkDiscoveryTable", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    global.fetch = mockFetch as any;
    global.alert = mockAlert as any;
    vi.clearAllMocks();
  });

  it("renders discover panel and empty state when no candidates", () => {
    render(<ParkDiscoveryTable candidates={[]} />);
    expect(screen.getAllByText(/discover parks/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(
      screen.getByText(/no candidates found/i)
    ).toBeInTheDocument();
  });

  it("Search button is disabled when no state selected", () => {
    render(<ParkDiscoveryTable candidates={[]} />);
    const btn = screen.getByRole("button", { name: /search/i });
    expect(btn).toBeDisabled();
  });

  it("enables Search and triggers discovery on click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ candidatesFound: 3 }),
    });
    render(<ParkDiscoveryTable candidates={[]} />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "UT" } });

    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/discovery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("UT"),
        })
      );
      expect(
        screen.getByText(/found 3 candidate\(s\) in UT/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error message when discovery fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "quota exceeded" }),
    });
    render(<ParkDiscoveryTable candidates={[]} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "CA" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/error: quota exceeded/i)).toBeInTheDocument();
    });
  });

  it("shows generic error when discovery fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    render(<ParkDiscoveryTable candidates={[]} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "AZ" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(screen.getByText(/error: offline/i)).toBeInTheDocument();
    });
  });

  it("renders candidate row with name, state, city, coordinates, source link", () => {
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    expect(screen.getByText("Sand Hollow OHV")).toBeInTheDocument();
    expect(screen.getByText("UT")).toBeInTheDocument();
    expect(screen.getByText("Hurricane")).toBeInTheDocument();
    expect(screen.getByText(/37\.1200, -113\.3700/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /link/i })).toHaveAttribute(
      "href",
      "https://example.com/sand-hollow"
    );
  });

  it("renders em-dashes for null city, coords, and sourceUrl", () => {
    render(
      <ParkDiscoveryTable
        candidates={[
          makeCandidate({
            city: null,
            estimatedLat: null,
            estimatedLng: null,
            sourceUrl: null,
          }),
        ]}
      />
    );
    // em-dashes appear in 3 cells
    const dashes = screen.getAllByText("\u2014");
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });

  it("renders PENDING status badge", () => {
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    // "PENDING" appears in both the status cell badge and the column header;
    // just assert at least one exists
    expect(screen.getAllByText(/PENDING/i).length).toBeGreaterThan(0);
  });

  it("renders 'Seeded' link when status ACCEPTED with seededParkId", () => {
    render(
      <ParkDiscoveryTable
        candidates={[
          makeCandidate({
            status: "ACCEPTED",
            seededParkId: "seeded-park-1",
          }),
        ]}
      />
    );
    const link = screen.getByRole("link", { name: /seeded/i });
    expect(link).toHaveAttribute("href", "/admin/parks/seeded-park-1");
  });

  it("renders REJECTED status badge with title attribute for reason", () => {
    render(
      <ParkDiscoveryTable
        candidates={[
          makeCandidate({
            status: "REJECTED",
            rejectedReason: "duplicate",
          }),
        ]}
      />
    );
    const badge = screen.getByText(/REJECTED/i);
    expect(badge).toHaveAttribute("title", "duplicate");
  });

  it("accepts a candidate via PATCH", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    fireEvent.click(screen.getByTitle(/accept/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/discovery/candidates",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("accept"),
        })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("alerts on accept API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "accept failed" }),
    });
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    fireEvent.click(screen.getByTitle(/accept/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("accept failed");
    });
  });

  it("opens reject input then rejects on confirm", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    // First "Reject" icon button
    fireEvent.click(screen.getByTitle(/^reject$/i));
    // Input appears
    const reasonInput = screen.getByPlaceholderText(/reason \(optional\)/i);
    fireEvent.change(reasonInput, { target: { value: "duplicate" } });
    // Confirm reject icon button
    fireEvent.click(screen.getByTitle(/confirm reject/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/discovery/candidates",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("duplicate"),
        })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("rejects on Enter key in reason input", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    fireEvent.click(screen.getByTitle(/^reject$/i));
    const reasonInput = screen.getByPlaceholderText(/reason \(optional\)/i);
    fireEvent.keyDown(reasonInput, { key: "Enter" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/discovery/candidates",
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  it("cancels reject input on Escape key", () => {
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    fireEvent.click(screen.getByTitle(/^reject$/i));
    const reasonInput = screen.getByPlaceholderText(/reason \(optional\)/i);
    fireEvent.keyDown(reasonInput, { key: "Escape" });
    expect(
      screen.queryByPlaceholderText(/reason \(optional\)/i)
    ).not.toBeInTheDocument();
  });

  it("alerts on reject API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "reject failed" }),
    });
    render(<ParkDiscoveryTable candidates={[makeCandidate()]} />);
    fireEvent.click(screen.getByTitle(/^reject$/i));
    fireEvent.click(screen.getByTitle(/confirm reject/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("reject failed");
    });
  });

  it("shows Accept All / Reject All bulk buttons when pending candidates exist", () => {
    render(
      <ParkDiscoveryTable
        candidates={[makeCandidate(), makeCandidate({ id: "cand-2" })]}
      />
    );
    expect(
      screen.getByRole("button", { name: /accept all pending \(2\)/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reject all pending \(2\)/i })
    ).toBeInTheDocument();
  });

  it("hides bulk action buttons when no pending candidates", () => {
    render(
      <ParkDiscoveryTable
        candidates={[
          makeCandidate({ status: "ACCEPTED", seededParkId: "p1" }),
        ]}
      />
    );
    expect(
      screen.queryByRole("button", { name: /accept all pending/i })
    ).not.toBeInTheDocument();
  });

  it("bulk-accepts all pending candidates", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(
      <ParkDiscoveryTable
        candidates={[makeCandidate(), makeCandidate({ id: "cand-2" })]}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept all pending/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("bulk-accept stops and alerts on first error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "first failed" }),
    });
    render(
      <ParkDiscoveryTable
        candidates={[makeCandidate(), makeCandidate({ id: "cand-2" })]}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /accept all pending/i })
    );

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bulk-rejects all pending candidates", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(
      <ParkDiscoveryTable
        candidates={[makeCandidate(), makeCandidate({ id: "cand-2" })]}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /reject all pending/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });
});
