import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { MapHeroBackfillRunner } from "@/components/admin/MapHeroBackfillRunner";

describe("MapHeroBackfillRunner", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Run backfill button when there is remaining work", () => {
    render(<MapHeroBackfillRunner initialRemaining={5} />);
    expect(
      screen.getByRole("button", { name: /run backfill/i })
    ).toBeInTheDocument();
  });

  it("disables the button and shows 'All parks covered' when initialRemaining is 0", () => {
    render(<MapHeroBackfillRunner initialRemaining={0} />);
    const btn = screen.getByRole("button", { name: /all parks covered/i });
    expect(btn).toBeDisabled();
  });

  it("runs a successful batch, then stops when processed is 0", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          processed: 3,
          succeeded: 3,
          failed: 0,
          failures: [],
          remaining: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          processed: 0,
          succeeded: 0,
          failed: 0,
          failures: [],
          remaining: 0,
        }),
      });

    render(<MapHeroBackfillRunner initialRemaining={3} />);
    fireEvent.click(screen.getByRole("button", { name: /run backfill/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/all eligible parks have a map hero/i)
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1); // processed or succeeded
  });

  it("displays failures returned by the API", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          processed: 2,
          succeeded: 1,
          failed: 1,
          failures: [
            { parkId: "p1", parkName: "Moab Sand", reason: "no lat/lng" },
          ],
          remaining: 0,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          processed: 0,
          succeeded: 0,
          failed: 0,
          failures: [],
          remaining: 0,
        }),
      });

    render(<MapHeroBackfillRunner initialRemaining={2} />);
    fireEvent.click(screen.getByRole("button", { name: /run backfill/i }));

    await waitFor(() => {
      expect(screen.getByText(/1 park\(s\) failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText("Moab Sand")).toBeInTheDocument();
    expect(screen.getByText(/no lat\/lng/i)).toBeInTheDocument();
  });

  it("shows error state when the batch API returns a non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    render(<MapHeroBackfillRunner initialRemaining={5} />);
    fireEvent.click(screen.getByRole("button", { name: /run backfill/i }));

    await waitFor(() => {
      expect(screen.getByText(/batch failed/i)).toBeInTheDocument();
    });
    expect(
      screen.getByText(/HTTP 500: Internal Server Error/i)
    ).toBeInTheDocument();
  });

  it("shows error state when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network offline"));

    render(<MapHeroBackfillRunner initialRemaining={5} />);
    fireEvent.click(screen.getByRole("button", { name: /run backfill/i }));

    await waitFor(() => {
      expect(screen.getByText(/batch failed/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/network offline/i)).toBeInTheDocument();
  });
});
