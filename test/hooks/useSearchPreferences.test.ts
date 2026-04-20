import { act, renderHook, waitFor } from "@testing-library/react";
import { useSearchPreferences } from "@/hooks/useSearchPreferences";
import { useSession } from "next-auth/react";
import type { SavedSearchFilters } from "@/lib/search-preferences";
import { vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

global.fetch = vi.fn();

const validFilters: SavedSearchFilters = {
  selectedState: "CA",
  selectedTerrains: ["sand"],
  selectedAmenities: [],
  selectedCamping: [],
  selectedVehicleTypes: ["atv"],
  minTrailMiles: 10,
  minAcres: 0,
  minRating: "",
  selectedOwnership: "",
  permitRequired: "yes",
  membershipRequired: "",
  flagsRequired: "",
  sparkArrestorRequired: "",
};

describe("useSearchPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null preference and marks loaded when unauthenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });
    expect(result.current.preference).toBeNull();
    expect(result.current.hasPreference).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("stays in loading state while session is resolving", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useSearchPreferences());

    // hasLoaded is false while NextAuth status is still "loading".
    expect(result.current.hasLoaded).toBe(false);
    expect(result.current.preference).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches and stores the saved preference when authenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: validFilters,
        updatedAt: "2026-04-01T00:00:00Z",
      }),
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/me/search-preferences");
    expect(result.current.preference?.filters).toEqual(validFilters);
    expect(result.current.hasPreference).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it("stores null preference when GET returns non-ok", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(result.current.preference).toBeNull();
    expect(result.current.hasPreference).toBe(false);
  });

  it("does not fetch when caller is anonymous (savePreference is a no-op)", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useSearchPreferences());

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.savePreference(validFilters);
    });

    expect(saved).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.preference).toBeNull();
  });

  it("savePreference PUTs filters and stores the response", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    // Initial GET returns null (no saved preference yet).
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });
    expect(result.current.preference).toBeNull();

    // PUT returns the saved filters with a timestamp.
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: validFilters,
        updatedAt: "2026-04-15T00:00:00Z",
      }),
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.savePreference(validFilters);
    });

    expect(saved).toBe(true);
    expect(result.current.preference).toEqual({
      filters: validFilters,
      updatedAt: "2026-04-15T00:00:00Z",
    });
    expect(result.current.hasPreference).toBe(true);

    const putCall = (global.fetch as any).mock.calls[1];
    expect(putCall[0]).toBe("/api/me/search-preferences");
    expect(putCall[1].method).toBe("PUT");
    expect(JSON.parse(putCall[1].body)).toEqual({ filters: validFilters });
  });

  it("savePreference returns false and does not overwrite state when response is non-ok", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid filters payload" }),
    });

    let saved: boolean | undefined;
    await act(async () => {
      saved = await result.current.savePreference(validFilters);
    });

    expect(saved).toBe(false);
    expect(result.current.preference).toBeNull();
  });

  it("clearPreference DELETEs and resets state to null", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    // Initial GET returns an existing preference.
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: validFilters,
        updatedAt: "2026-04-01T00:00:00Z",
      }),
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasPreference).toBe(true);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    let cleared: boolean | undefined;
    await act(async () => {
      cleared = await result.current.clearPreference();
    });

    expect(cleared).toBe(true);
    expect(result.current.preference).toBeNull();
    expect(result.current.hasPreference).toBe(false);

    const deleteCall = (global.fetch as any).mock.calls[1];
    expect(deleteCall[0]).toBe("/api/me/search-preferences");
    expect(deleteCall[1].method).toBe("DELETE");
  });

  it("clearPreference is a no-op when unauthenticated", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as any);

    const { result } = renderHook(() => useSearchPreferences());

    let cleared: boolean | undefined;
    await act(async () => {
      cleared = await result.current.clearPreference();
    });

    expect(cleared).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("clearPreference returns false when DELETE fails", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: validFilters,
        updatedAt: "2026-04-01T00:00:00Z",
      }),
    });

    const { result } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasPreference).toBe(true);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "boom" }),
    });

    let cleared: boolean | undefined;
    await act(async () => {
      cleared = await result.current.clearPreference();
    });

    expect(cleared).toBe(false);
    // Prior preference remains because DELETE failed.
    expect(result.current.preference?.filters).toEqual(validFilters);
  });

  it("re-fetches when the user transitions from unauthenticated to authenticated", async () => {
    const mockSession = vi.mocked(useSession);
    mockSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    } as any);

    const { result, rerender } = renderHook(() => useSearchPreferences());

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });
    expect(global.fetch).not.toHaveBeenCalled();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        filters: validFilters,
        updatedAt: "2026-04-01T00:00:00Z",
      }),
    });

    mockSession.mockReturnValue({
      data: { user: { id: "u1" } },
      status: "authenticated",
      update: vi.fn(),
    } as any);

    rerender();

    await waitFor(() => {
      expect(result.current.hasPreference).toBe(true);
    });
    expect(result.current.preference?.filters).toEqual(validFilters);
  });
});
