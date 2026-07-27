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
