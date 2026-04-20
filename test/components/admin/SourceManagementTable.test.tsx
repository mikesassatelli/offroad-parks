import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SourceManagementTable } from "@/components/admin/SourceManagementTable";
import type { DataSourceSummary } from "@/lib/types";

const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

const makeSource = (
  overrides?: Partial<DataSourceSummary>
): DataSourceSummary => ({
  id: "src-1",
  parkId: "park-1",
  url: "https://example.com/park",
  type: "WEBSITE" as any,
  origin: "ADMIN_ADDED" as any,
  title: "Example Park Page",
  reliability: 75,
  isOfficial: false,
  lastCrawledAt: "2026-04-05T00:00:00Z",
  contentChanged: false,
  crawlStatus: "SUCCESS" as any,
  crawlError: null,
  approveCount: 10,
  rejectCount: 2,
  createdAt: "2026-04-01T00:00:00Z",
  ...overrides,
});

describe("SourceManagementTable", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    global.fetch = mockFetch as any;
    global.alert = mockAlert as any;
    vi.clearAllMocks();
  });

  it("renders research panel and add source form", () => {
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    expect(
      screen.getByRole("button", { name: /run research/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/park-info/i)).toBeInTheDocument();
  });

  it("shows empty state when no sources", () => {
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    expect(screen.getByText(/no sources yet/i)).toBeInTheDocument();
  });

  it("renders source with title, reliability, and status", () => {
    render(
      <SourceManagementTable sources={[makeSource()]} parkId="park-1" />
    );
    expect(screen.getByText("Example Park Page")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
    expect(screen.getByText(/SUCCESS/i)).toBeInTheDocument();
  });

  it("shows 'Never' when lastCrawledAt is null", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ lastCrawledAt: null })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("Never")).toBeInTheDocument();
  });

  it("shows Official badge when isOfficial is true", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ isOfficial: true })]}
        parkId="park-1"
      />
    );
    // Badge + add-form checkbox both use the word "Official"
    expect(screen.getAllByText("Official").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Low Accuracy badge when approve ratio is below 20%", () => {
    render(
      <SourceManagementTable
        sources={[
          makeSource({ approveCount: 1, rejectCount: 9 }),
        ]}
        parkId="park-1"
      />
    );
    expect(screen.getByText(/low accuracy/i)).toBeInTheDocument();
  });

  it("falls back to URL when title is null", () => {
    render(
      <SourceManagementTable
        sources={[
          makeSource({ title: null, url: "https://foo.example/page" }),
        ]}
        parkId="park-1"
      />
    );
    expect(screen.getByText(/foo\.example\/page/i)).toBeInTheDocument();
  });

  it("formats origin labels", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ origin: "AI_DISCOVERED" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("AI")).toBeInTheDocument();
  });

  it("shows unknown origin string through as-is", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ origin: "UNKNOWN" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("UNKNOWN")).toBeInTheDocument();
  });

  it("styles reliability based on thresholds", () => {
    const { rerender } = render(
      <SourceManagementTable
        sources={[makeSource({ reliability: 80 })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("80").className).toMatch(/green/);

    rerender(
      <SourceManagementTable
        sources={[makeSource({ reliability: 50 })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("50").className).toMatch(/yellow/);

    rerender(
      <SourceManagementTable
        sources={[makeSource({ reliability: 20 })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("20").className).toMatch(/red/);
  });

  it("renders status badges for SKIPPED, WRONG_PARK, ROBOTS_BLOCKED", () => {
    const { rerender } = render(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "SKIPPED" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText(/SKIPPED/i)).toBeInTheDocument();

    rerender(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "WRONG_PARK" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText(/WRONG PARK/i)).toBeInTheDocument();

    rerender(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "ROBOTS_BLOCKED" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText(/ROBOTS BLOCKED/i)).toBeInTheDocument();
  });

  it("falls back to 'default' style for unknown crawl status", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "MYSTERY" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByText("MYSTERY")).toBeInTheDocument();
  });

  it("runs research successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: "sess-42" }),
    });
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    fireEvent.click(screen.getByRole("button", { name: /run research/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/research complete\. session: sess-42/i)
      ).toBeInTheDocument();
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("shows research error message when API returns not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "research broken" }),
    });
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    fireEvent.click(screen.getByRole("button", { name: /run research/i }));

    await waitFor(() => {
      expect(screen.getByText(/error: research broken/i)).toBeInTheDocument();
    });
  });

  it("shows generic research error when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("offline"));
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    fireEvent.click(screen.getByRole("button", { name: /run research/i }));

    await waitFor(() => {
      expect(screen.getByText(/error: offline/i)).toBeInTheDocument();
    });
  });

  it("adds a new source via POST", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<SourceManagementTable sources={[]} parkId="park-1" />);

    await user.type(
      screen.getByPlaceholderText(/park-info/i),
      "https://new.example/page"
    );
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/sources",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("new.example"),
        })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("alerts on add source error", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "add failed" }),
    });
    render(<SourceManagementTable sources={[]} parkId="park-1" />);
    await user.type(
      screen.getByPlaceholderText(/park-info/i),
      "https://example.com"
    );
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("add failed");
    });
  });

  it("calls source action (skip) via PATCH", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(
      <SourceManagementTable sources={[makeSource()]} parkId="park-1" />
    );

    fireEvent.click(screen.getByTitle(/^skip —/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/sources",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("skip"),
        })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("calls wrong_park action via PATCH", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(
      <SourceManagementTable sources={[makeSource()]} parkId="park-1" />
    );
    fireEvent.click(screen.getByTitle(/wrong park/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/sources",
        expect.objectContaining({
          method: "PATCH",
          body: expect.stringContaining("wrong_park"),
        })
      );
    });
  });

  it("alerts on source action error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "action failed" }),
    });
    render(
      <SourceManagementTable sources={[makeSource()]} parkId="park-1" />
    );
    fireEvent.click(screen.getByTitle(/^skip —/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("action failed");
    });
  });

  it("shows unskip button when source is SKIPPED", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "SKIPPED" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByTitle(/allow crawling again/i)).toBeInTheDocument();
  });

  it("shows restore button when source is WRONG_PARK", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "WRONG_PARK" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByTitle(/undo wrong park/i)).toBeInTheDocument();
  });

  it("shows override button when source is ROBOTS_BLOCKED", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ crawlStatus: "ROBOTS_BLOCKED" as any })]}
        parkId="park-1"
      />
    );
    expect(screen.getByTitle(/override/i)).toBeInTheDocument();
  });

  it("shows untrust button for official sources", () => {
    render(
      <SourceManagementTable
        sources={[makeSource({ isOfficial: true })]}
        parkId="park-1"
      />
    );
    expect(screen.getByTitle(/untrust/i)).toBeInTheDocument();
  });

  it("shows trust button for unofficial sources", () => {
    render(
      <SourceManagementTable sources={[makeSource()]} parkId="park-1" />
    );
    expect(screen.getByTitle(/^trust/i)).toBeInTheDocument();
  });
});
