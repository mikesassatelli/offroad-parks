/**
 * Client helper for the `/api/geocode` route.
 *
 * Turns a typed location string into coordinates the home page can drop into
 * its existing "distance-nearest" coords channel. Returns `null` for an empty
 * query, a miss (404), or any network/parse failure so callers can degrade
 * gracefully.
 */
export interface GeocodeResult {
  lat: number;
  lng: number;
  placeName: string;
}

export async function geocodeQuery(
  query: string,
): Promise<GeocodeResult | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.lat !== "number" || typeof data?.lng !== "number") {
      return null;
    }
    return {
      lat: data.lat,
      lng: data.lng,
      placeName: typeof data.placeName === "string" ? data.placeName : q,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch as-you-type location suggestions from the `/api/geocode` route in its
 * suggestions mode. Returns an empty array for a too-short query, a miss, or
 * any network/parse failure so the autocomplete dropdown degrades gracefully.
 * Requires at least 2 characters to avoid noisy single-letter lookups.
 */
export async function geocodeSuggestions(
  query: string,
  limit = 5,
): Promise<GeocodeResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const res = await fetch(
      `/api/geocode?q=${encodeURIComponent(q)}&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.suggestions)) return [];
    return data.suggestions
      .filter(
        (s: unknown) =>
          typeof (s as GeocodeResult)?.lat === "number" &&
          typeof (s as GeocodeResult)?.lng === "number",
      )
      .map((s: GeocodeResult) => ({
        lat: s.lat,
        lng: s.lng,
        placeName: typeof s.placeName === "string" ? s.placeName : q,
      }));
  } catch {
    return [];
  }
}
