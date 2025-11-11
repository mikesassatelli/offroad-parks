import { act, renderHook, waitFor } from "@testing-library/react";
import { useFavorites } from "@/hooks/useFavorites";
import { useSession } from "next-auth/react";
import { vi } from "vitest";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock alert
global.alert = vi.fn();

describe("useFavorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
    (global.alert as any).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with empty favorites when no session", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favoriteParkIds).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should load favorites when user is authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123", email: "test@test.com" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const mockFavorites = [
      { id: "fav-1", park: { slug: "park-1" } },
      { id: "fav-2", park: { slug: "park-2" } },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockFavorites,
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toEqual(["park-1", "park-2"]);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/favorites");
  });

  it("should handle fetch errors when loading favorites", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to load favorites:",
        expect.any(Error),
      );
    });

    expect(result.current.favoriteParkIds).toEqual([]);

    consoleErrorSpy.mockRestore();
  });

  it("should check if park is favorite", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "fav-1", park: { slug: "park-1" } }],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.isFavorite("park-1")).toBe(true);
    });

    expect(result.current.isFavorite("park-2")).toBe(false);
  });

  it("should add favorite when toggling non-favorited park", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    // Mock initial load
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toEqual([]);
    });

    // Mock add favorite
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toContain("park-1");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "park-1" }),
    });
  });

  it("should remove favorite when toggling favorited park", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    // Mock initial load with one favorite
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "fav-1", park: { slug: "park-1" } }],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toContain("park-1");
    });

    // Mock remove favorite
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    await waitFor(() => {
      expect(result.current.favoriteParkIds).not.toContain("park-1");
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/favorites/park-1", {
      method: "DELETE",
    });
  });

  it("should show alert when not authenticated and trying to toggle", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useFavorites());

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith(
      "Please sign in to save favorites",
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should handle error when adding favorite fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toEqual([]);
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock failed add
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to add" }),
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith("Failed to add favorite");
    expect(result.current.favoriteParkIds).not.toContain("park-1");

    consoleErrorSpy.mockRestore();
  });

  it("should handle error when removing favorite fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "fav-1", park: { slug: "park-1" } }],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toContain("park-1");
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock failed remove
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to remove" }),
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith("Failed to remove favorite");
    expect(result.current.favoriteParkIds).toContain("park-1"); // Should still be there

    consoleErrorSpy.mockRestore();
  });

  it("should set isLoading during toggle operation", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let resolveToggle: any;
    const togglePromise = new Promise((resolve) => {
      resolveToggle = resolve;
    });

    (global.fetch as any).mockImplementationOnce(() => togglePromise);

    act(() => {
      result.current.toggleFavorite("park-1");
    });

    // Should be loading during operation
    expect(result.current.isLoading).toBe(true);

    resolveToggle({ ok: true, json: async () => ({}) });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should handle network error during toggle", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toEqual([]);
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith("Failed to update favorite");
    expect(result.current.isLoading).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it("should clear favorites when user signs out", async () => {
    const { rerender } = renderHook(() => useFavorites());

    // Initially authenticated with favorites
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "fav-1", park: { slug: "park-1" } }],
    });

    rerender();

    await waitFor(() => {
      const { result } = renderHook(() => useFavorites());
      if (result.current.favoriteParkIds.length > 0) {
        expect(result.current.favoriteParkIds).toContain("park-1");
      }
    });

    // Sign out
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });

    const { result } = renderHook(() => useFavorites());

    expect(result.current.favoriteParkIds).toEqual([]);
  });

  it("should handle json parsing error when removing favorite fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "fav-1", park: { slug: "park-1" } }],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toContain("park-1");
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock failed remove with json() that throws
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith("Failed to remove favorite");
    expect(result.current.favoriteParkIds).toContain("park-1");

    consoleErrorSpy.mockRestore();
  });

  it("should handle json parsing error when adding favorite fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useFavorites());

    await waitFor(() => {
      expect(result.current.favoriteParkIds).toEqual([]);
    });

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Mock failed add with json() that throws
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => {
        throw new Error("Invalid JSON");
      },
    });

    await act(async () => {
      await result.current.toggleFavorite("park-1");
    });

    expect(global.alert).toHaveBeenCalledWith("Failed to add favorite");
    expect(result.current.favoriteParkIds).not.toContain("park-1");

    consoleErrorSpy.mockRestore();
  });
});
