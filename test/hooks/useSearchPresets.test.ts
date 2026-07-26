import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import { useSearchPresets } from "@/hooks/useSearchPresets";
import type { SavedSearchFilters } from "@/lib/search-preferences";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));

const filters: SavedSearchFilters = {
  selectedState: "CA",
  selectedTerrains: [],
  selectedAmenities: [],
  selectedCamping: [],
  selectedVehicleTypes: [],
  minTrailMiles: 0,
  minAcres: 0,
  minRating: "",
  selectedOwnership: "",
  permitRequired: "",
  membershipRequired: "",
  flagsRequired: "",
  sparkArrestorRequired: "",
};

function authed() {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1" } },
    status: "authenticated",
  } as any);
}

describe("useSearchPresets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("does not fetch and stays empty when unauthenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as any);

    const { result } = renderHook(() => useSearchPresets());

    expect(result.current.presets).toEqual([]);
    expect(result.current.isAuthenticated).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("loads presets on mount when authenticated", async () => {
    authed();
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ presets: [{ id: "p1", name: "Sand", filters }] }),
    } as any);

    const { result } = renderHook(() => useSearchPresets());

    await waitFor(() => expect(result.current.presets).toHaveLength(1));
    expect(result.current.presets[0].name).toBe("Sand");
    expect(global.fetch).toHaveBeenCalledWith("/api/me/search-presets");
  });

  it("prepends a created preset on success", async () => {
    authed();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presets: [] }) } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ preset: { id: "p2", name: "Rocks", filters } }),
      } as any);

    const { result } = renderHook(() => useSearchPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: { ok: boolean; error?: string } = { ok: false };
    await act(async () => {
      res = await result.current.createPreset("Rocks", filters);
    });

    expect(res.ok).toBe(true);
    expect(result.current.presets).toHaveLength(1);
    expect(result.current.presets[0].name).toBe("Rocks");
  });

  it("surfaces the server error when create fails", async () => {
    authed();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ presets: [] }) } as any)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "You already have a preset with that name." }),
      } as any);

    const { result } = renderHook(() => useSearchPresets());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let res: { ok: boolean; error?: string } = { ok: true };
    await act(async () => {
      res = await result.current.createPreset("Dup", filters);
    });

    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/name/i);
    expect(result.current.presets).toHaveLength(0);
  });

  it("removes a preset on successful delete", async () => {
    authed();
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ presets: [{ id: "p1", name: "Sand", filters }] }),
      } as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) } as any);

    const { result } = renderHook(() => useSearchPresets());
    await waitFor(() => expect(result.current.presets).toHaveLength(1));

    let ok = false;
    await act(async () => {
      ok = await result.current.deletePreset("p1");
    });

    expect(ok).toBe(true);
    expect(result.current.presets).toHaveLength(0);
    expect(global.fetch).toHaveBeenLastCalledWith("/api/me/search-presets/p1", {
      method: "DELETE",
    });
  });
});
