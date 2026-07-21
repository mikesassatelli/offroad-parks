"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Park } from "@/lib/types";
import type { ParkPage } from "@/lib/park-query";

function withPage(queryString: string, page: number): string {
  return queryString ? `${queryString}&page=${page}` : `page=${page}`;
}

interface UseParkListArgs {
  /** Serialised filter query (from `buildParkQueryString`), WITHOUT `page`. */
  queryString: string;
  /** Server-rendered first page — used verbatim while the filters are still
   *  the ones the page was rendered with (no redundant refetch on mount). */
  initialData: ParkPage;
}

export interface UseParkListResult {
  parks: Park[];
  /** Reset load (filters changed) in flight. */
  isLoading: boolean;
  /** Appending the next page in flight. */
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: string | null;
}

/**
 * Infinite-scroll list backed by `/api/parks`.
 *
 * Seeds from `initialData`. When the serialised filters change it resets to
 * page 0 and refetches; `loadMore()` appends the next page. Stale responses
 * (filters changed mid-flight) are discarded via a monotonic request id.
 */
export function useParkList({
  queryString,
  initialData,
}: UseParkListArgs): UseParkListResult {
  const initialQueryString = useRef(queryString);
  const [parks, setParks] = useState<Park[]>(initialData.parks);
  const [nextPage, setNextPage] = useState<number | null>(initialData.nextPage);
  const [hasMore, setHasMore] = useState(initialData.hasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every filter change; page fetches carry the id they started with
  // so responses from a superseded filter generation can be ignored.
  const generation = useRef(0);
  const skippedInitial = useRef(false);
  // Synchronous guard so an IntersectionObserver that fires several times
  // before React re-renders can't kick off duplicate page fetches.
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    // The very first render is already seeded from server data when the filters
    // still match what the page was rendered with.
    if (!skippedInitial.current) {
      skippedInitial.current = true;
      if (queryString === initialQueryString.current) return;
    }

    const id = ++generation.current;
    const controller = new AbortController();
    loadingMoreRef.current = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/parks?${withPage(queryString, 0)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ParkPage = await res.json();
        if (id !== generation.current) return;
        setParks(data.parks);
        setNextPage(data.nextPage);
        setHasMore(data.hasMore);
      } catch {
        if (controller.signal.aborted || id !== generation.current) return;
        setError("Failed to load parks");
      } finally {
        if (id === generation.current) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [queryString]);

  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || isLoading || !hasMore || nextPage == null) {
      return;
    }
    const id = generation.current;
    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    (async () => {
      try {
        const res = await fetch(`/api/parks?${withPage(queryString, nextPage)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ParkPage = await res.json();
        // Discard if the filters changed while this page was loading.
        if (id !== generation.current) return;
        setParks((current) => [...current, ...data.parks]);
        setNextPage(data.nextPage);
        setHasMore(data.hasMore);
      } catch {
        if (id === generation.current) setError("Failed to load more parks");
      } finally {
        loadingMoreRef.current = false;
        if (id === generation.current) setIsLoadingMore(false);
      }
    })();
  }, [queryString, nextPage, hasMore, isLoading]);

  return { parks, isLoading, isLoadingMore, hasMore, loadMore, error };
}

interface UseParkMarkersArgs {
  queryString: string;
  initialMarkers: Park[];
  /** Only fetch when the map view is (or has been) active. */
  enabled: boolean;
}

/**
 * Full filtered set of lightweight map markers, backed by
 * `/api/parks/markers`. Seeds from `initialMarkers`; refetches when the
 * filters change while the map is active, or when the map first becomes active
 * under filters that differ from the last load.
 */
export function useParkMarkers({
  queryString,
  initialMarkers,
  enabled,
}: UseParkMarkersArgs): Park[] {
  const [markers, setMarkers] = useState<Park[]>(initialMarkers);
  const lastLoaded = useRef<string>(queryString);
  const generation = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (queryString === lastLoaded.current) return;

    const id = ++generation.current;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`/api/parks/markers?${queryString}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: { parks: Park[] } = await res.json();
        if (id !== generation.current) return;
        setMarkers(data.parks);
        lastLoaded.current = queryString;
      } catch {
        /* keep the previous markers on failure */
      }
    })();

    return () => controller.abort();
  }, [queryString, enabled]);

  return markers;
}
