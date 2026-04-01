import { act, renderHook, waitFor } from "@testing-library/react";
import { useParkReview } from "@/hooks/useParkReview";
import { useSession } from "next-auth/react";
import { vi } from "vitest";
import type { Review } from "@/lib/types";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

const mockReview: Review = {
  id: "review-1",
  parkId: "park-id-1",
  parkSlug: "test-park",
  parkName: "Test Park",
  userId: "user-123",
  userName: "Test User",
  overallRating: 5,
  terrainRating: 4,
  facilitiesRating: 4,
  difficultyRating: 3,
  title: "Great park",
  body: "Really enjoyed it",
  status: "APPROVED",
  helpfulCount: 0,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

describe("useParkReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null review and no loading when not authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    expect(result.current.userReview).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("loadUserReview: loads user review when authenticated and review exists", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123", email: "test@test.com" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reviews: [mockReview, { ...mockReview, id: "review-2", parkSlug: "other-park" }],
      }),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/reviews/user");
    expect(result.current.userReview).toEqual(mockReview);
    expect(result.current.isLoading).toBe(false);
  });

  it("loadUserReview: returns null review when authenticated but no review exists yet", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123", email: "test@test.com" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [] }),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(result.current.userReview).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("loadUserReview: does nothing when not authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.userReview).toBeNull();
  });

  it("loadUserReview: sets error state when API call fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(result.current.error).toBe("Failed to fetch user reviews");
    expect(result.current.userReview).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("createReview: calls POST /api/parks/[slug]/reviews with correct body and updates state on success", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const reviewData = {
      overallRating: 5,
      terrainRating: 4,
      facilitiesRating: 4,
      difficultyRating: 3,
      body: "Great park!",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ review: mockReview }),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.createReview(reviewData);
    });

    expect(createResult.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith("/api/parks/test-park/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });
    expect(result.current.userReview).toEqual(mockReview);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("createReview: handles 409 conflict (already reviewed)", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "You have already reviewed this park" }),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.createReview({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Trying again",
      });
    });

    expect(createResult.success).toBe(false);
    expect(createResult.message).toBe("You have already reviewed this park");
    expect(result.current.error).toBe("You have already reviewed this park");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("createReview: returns early when not authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useParkReview("test-park"));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.createReview({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test review",
      });
    });

    expect(createResult).toEqual({
      success: false,
      message: "Please sign in to submit a review",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("createReview: sets error state when API call fails due to network error", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useParkReview("test-park"));

    let createResult: any;
    await act(async () => {
      createResult = await result.current.createReview({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test",
      });
    });

    expect(createResult.success).toBe(false);
    expect(createResult.message).toBe("Network error");
    expect(result.current.error).toBe("Network error");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("updateReview: calls PUT with correct body and updates state", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useParkReview("test-park"));

    // Load existing review first
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [mockReview] }),
    });

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(result.current.userReview).toEqual(mockReview);

    const updatedReview = { ...mockReview, body: "Updated review body", overallRating: 4 };
    const updateData = {
      overallRating: 4,
      terrainRating: 4,
      facilitiesRating: 4,
      difficultyRating: 3,
      body: "Updated review body",
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ review: updatedReview }),
    });

    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.updateReview(updateData);
    });

    expect(updateResult.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(`/api/reviews/${mockReview.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    expect(result.current.userReview).toEqual(updatedReview);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("updateReview: returns early when no review to update", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useParkReview("test-park"));

    // No review loaded - userReview is null
    let updateResult: any;
    await act(async () => {
      updateResult = await result.current.updateReview({
        overallRating: 4,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "No review yet",
      });
    });

    expect(updateResult).toEqual({ success: false, message: "No review to update" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deleteReview: calls DELETE and clears review state", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useParkReview("test-park"));

    // Load existing review first
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [mockReview] }),
    });

    await act(async () => {
      await result.current.loadUserReview();
    });

    expect(result.current.userReview).toEqual(mockReview);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    let deleteResult: any;
    await act(async () => {
      deleteResult = await result.current.deleteReview();
    });

    expect(deleteResult).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith(`/api/reviews/${mockReview.id}`, {
      method: "DELETE",
    });
    expect(result.current.userReview).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("deleteReview: returns early when no review exists", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useParkReview("test-park"));

    // userReview is null by default
    let deleteResult: any;
    await act(async () => {
      deleteResult = await result.current.deleteReview();
    });

    expect(deleteResult).toEqual({ success: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("deleteReview: sets error state when API call fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useParkReview("test-park"));

    // Load existing review first
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reviews: [mockReview] }),
    });

    await act(async () => {
      await result.current.loadUserReview();
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Cannot delete review" }),
    });

    let deleteResult: any;
    await act(async () => {
      deleteResult = await result.current.deleteReview();
    });

    expect(deleteResult).toEqual({ success: false });
    expect(result.current.error).toBe("Cannot delete review");
    expect(result.current.isSubmitting).toBe(false);
  });
});
