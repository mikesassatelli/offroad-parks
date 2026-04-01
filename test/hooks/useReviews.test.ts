import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviews, useRecentReviews } from "@/hooks/useReviews";
import { vi } from "vitest";
import type { Review } from "@/lib/types";

// Mock fetch
global.fetch = vi.fn();

const makeReview = (id: string, parkSlug = "test-park"): Review => ({
  id,
  parkId: "park-id-1",
  parkSlug,
  parkName: "Test Park",
  userId: "user-123",
  userName: "Test User",
  overallRating: 4,
  terrainRating: 4,
  facilitiesRating: 3,
  difficultyRating: 3,
  body: `Review body ${id}`,
  status: "APPROVED",
  helpfulCount: 0,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
});

const mockPagination = {
  page: 1,
  limit: 10,
  total: 2,
  totalPages: 1,
};

describe("useReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches reviews on mount with correct URL", async () => {
    const mockReviews = [makeReview("review-1"), makeReview("review-2")];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: mockReviews, pagination: mockPagination }),
    });

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/parks/test-park/reviews?page=1&limit=10"
    );
    expect(result.current.reviews).toEqual(mockReviews);
    expect(result.current.pagination).toEqual(mockPagination);
  });

  it("handles pagination - changes page and refetches", async () => {
    const page1Reviews = [makeReview("review-1"), makeReview("review-2")];
    const page2Reviews = [makeReview("review-3"), makeReview("review-4")];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: page1Reviews,
        pagination: { page: 1, limit: 10, total: 4, totalPages: 2 },
      }),
    });

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.reviews).toEqual(page1Reviews);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: page2Reviews,
        pagination: { page: 2, limit: 10, total: 4, totalPages: 2 },
      }),
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.reviews).toEqual(page2Reviews);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/parks/test-park/reviews?page=2&limit=10"
    );
  });

  it("returns loading state while fetching", async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockImplementationOnce(() => promise);

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    expect(result.current.isLoading).toBe(true);

    resolvePromise({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("returns error state when fetch fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch reviews");
    expect(result.current.reviews).toEqual([]);
  });

  it("returns error state when network error occurs", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Network error");
    expect(result.current.reviews).toEqual([]);
  });

  it("does not fetch when parkSlug is not provided", async () => {
    const { result } = renderHook(() => useReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.reviews).toEqual([]);
  });

  it("refresh triggers a refetch", async () => {
    const initialReviews = [makeReview("review-1")];
    const refreshedReviews = [makeReview("review-1"), makeReview("review-2")];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: initialReviews, pagination: mockPagination }),
    });

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park" })
    );

    await waitFor(() => {
      expect(result.current.reviews).toEqual(initialReviews);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: refreshedReviews,
        pagination: { ...mockPagination, total: 2 },
      }),
    });

    await act(async () => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.reviews).toEqual(refreshedReviews);
    });
  });

  it("respects custom limit parameter in URL", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: { ...mockPagination, limit: 5 } }),
    });

    const { result } = renderHook(() =>
      useReviews({ parkSlug: "test-park", limit: 5 })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/parks/test-park/reviews?page=1&limit=5"
    );
  });
});

describe("useRecentReviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches from correct endpoint on mount", async () => {
    const mockReviews = [makeReview("review-1", "park-a"), makeReview("review-2", "park-b")];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: mockReviews, pagination: mockPagination }),
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/reviews/recent?page=1&limit=10"
    );
    expect(result.current.reviews).toEqual(mockReviews);
  });

  it("applies filters to the request URL", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    act(() => {
      result.current.setFilters({ minRating: "4", vehicleType: "UTV", state: "CO" });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("minRating=4")
      );
    });

    const lastCall = (global.fetch as any).mock.calls.at(-1)[0] as string;
    expect(lastCall).toContain("vehicleType=UTV");
    expect(lastCall).toContain("state=CO");
  });

  it("resets to page 1 when filters change", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: [],
        pagination: { page: 1, limit: 10, total: 20, totalPages: 2 },
      }),
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Navigate to page 2
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: [],
        pagination: { page: 2, limit: 10, total: 20, totalPages: 2 },
      }),
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.pagination.page).toBe(2);
    });

    // Now change filters - should reset to page 1
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: [],
        pagination: { page: 1, limit: 10, total: 5, totalPages: 1 },
      }),
    });

    act(() => {
      result.current.setFilters({ minRating: "4" });
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const lastCall = (global.fetch as any).mock.calls.at(-1)[0] as string;
    expect(lastCall).toContain("page=1");
  });

  it("clearFilters resets filters and page", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Set some filters
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    act(() => {
      result.current.setFilters({ minRating: "4" });
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ minRating: "4" });
    });

    // Clear filters
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    act(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({});
    });

    const lastCall = (global.fetch as any).mock.calls.at(-1)[0] as string;
    expect(lastCall).not.toContain("minRating");
  });

  it("returns error state when fetch fails", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch reviews");
    expect(result.current.reviews).toEqual([]);
  });

  it("exposes filters and setFilters in return value", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [], pagination: mockPagination }),
    });

    const { result } = renderHook(() => useRecentReviews({}));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.filters).toEqual({});
    expect(typeof result.current.setFilters).toBe("function");
    expect(typeof result.current.clearFilters).toBe("function");
  });
});
