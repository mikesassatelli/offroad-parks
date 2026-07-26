"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { SavedSearchFilters } from "@/lib/search-preferences";

export interface FilterPreset {
  id: string;
  name: string;
  filters: SavedSearchFilters;
  updatedAt: string;
}

interface SaveResult {
  ok: boolean;
  /** Server-provided message on failure (name conflict, cap reached, …). */
  error?: string;
}

/**
 * Client hook for a signed-in user's named Filters-panel presets.
 *
 * Lifecycle:
 *   - On mount (+ when the user signs in), loads `GET /api/me/search-presets`.
 *   - `createPreset(name, filters)` → `POST` (prepends on success).
 *   - `deletePreset(id)` → `DELETE` (removes on success).
 *
 * Applying a preset is the caller's job — wire the returned `presets[].filters`
 * into `applyFilters` from `useFilteredParks`. Anonymous callers never hit the
 * network; `presets` stays empty.
 */
export function useSearchPresets() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setPresets([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetch("/api/me/search-presets")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { presets: FilterPreset[] } | null) => {
        if (cancelled) return;
        setPresets(data?.presets ?? []);
      })
      .catch((err) => {
        /* v8 ignore next 2 */
        console.error("Failed to load filter presets", err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status]);

  const createPreset = useCallback(
    async (name: string, filters: SavedSearchFilters): Promise<SaveResult> => {
      if (!isAuthenticated) return { ok: false };
      setIsSaving(true);
      try {
        const res = await fetch("/api/me/search-presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, filters }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data?.error };
        }
        setPresets((prev) => [data.preset as FilterPreset, ...prev]);
        return { ok: true };
      } catch (err) {
        /* v8 ignore next 2 */
        console.error("Failed to save filter preset", err);
        return { ok: false };
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated],
  );

  const deletePreset = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAuthenticated) return false;
      try {
        const res = await fetch(`/api/me/search-presets/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) return false;
        setPresets((prev) => prev.filter((p) => p.id !== id));
        return true;
      } catch (err) {
        /* v8 ignore next 2 */
        console.error("Failed to delete filter preset", err);
        return false;
      }
    },
    [isAuthenticated],
  );

  return {
    presets,
    isAuthenticated,
    isLoading,
    isSaving,
    createPreset,
    deletePreset,
  };
}
