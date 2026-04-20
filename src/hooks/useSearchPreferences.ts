"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { SavedSearchFilters } from "@/lib/search-preferences";

interface LoadedPreference {
  filters: SavedSearchFilters;
  updatedAt: string;
}

/**
 * Client hook for managing a signed-in user's default Filters panel state.
 *
 * Lifecycle:
 *   - On mount (+ when the user signs in), fetches `GET /api/me/search-preferences`
 *     and stores the saved default (if any) in state.
 *   - `savePreference(filters)` → `PUT /api/me/search-preferences`
 *   - `clearPreference()` → `DELETE /api/me/search-preferences`
 *
 * Does NOT apply filters to the filters panel — the caller wires up
 * `applyFilters` from `useFilteredParks` to the returned `preference.filters`.
 *
 * Anonymous callers never hit the network; `preference` stays null.
 */
export function useSearchPreferences() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated" && !!session?.user;

  const [preference, setPreference] = useState<LoadedPreference | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setPreference(null);
      setHasLoaded(status !== "loading");
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    fetch("/api/me/search-preferences")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: LoadedPreference | null) => {
        if (cancelled) return;
        setPreference(data);
      })
      .catch((err) => {
        /* v8 ignore next 2 */
        console.error("Failed to load search preferences", err);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
        setHasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, status]);

  const savePreference = useCallback(
    async (filters: SavedSearchFilters): Promise<boolean> => {
      if (!isAuthenticated) return false;
      setIsSaving(true);
      try {
        const res = await fetch("/api/me/search-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filters }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as {
          filters: SavedSearchFilters;
          updatedAt: string;
        };
        setPreference({ filters: data.filters, updatedAt: data.updatedAt });
        return true;
      } catch (err) {
        /* v8 ignore next 2 */
        console.error("Failed to save search preference", err);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated],
  );

  const clearPreference = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) return false;
    setIsSaving(true);
    try {
      const res = await fetch("/api/me/search-preferences", {
        method: "DELETE",
      });
      if (!res.ok) return false;
      setPreference(null);
      return true;
    } catch (err) {
      /* v8 ignore next 2 */
      console.error("Failed to clear search preference", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated]);

  return {
    preference,
    hasPreference: preference !== null,
    isAuthenticated,
    isLoading,
    hasLoaded,
    isSaving,
    savePreference,
    clearPreference,
  };
}
