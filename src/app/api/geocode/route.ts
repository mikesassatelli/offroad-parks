import { NextResponse } from "next/server";

// Depends on the request query string, so it must never be statically cached.
export const dynamic = "force-dynamic";

interface MapboxFeature {
  center?: [number, number];
  place_name?: string;
}

/**
 * GET /api/geocode?q=…[&limit=N]
 *
 * Server-side forward geocoding via Mapbox. Lets the home page turn a typed
 * location ("Denver, CO", "90210") into coordinates that feed the existing
 * "distance-nearest" coords channel — without the client hitting Mapbox
 * directly.
 *
 * Two modes, keyed off `limit`:
 *  - Default (single match): returns `{ lat, lng, placeName }` on a hit,
 *    404 when nothing matches.
 *  - Suggestions (`limit` > 1): returns `{ suggestions: [{ lat, lng,
 *    placeName }, …] }` for as-you-type autocomplete. Degrades to an empty
 *    list rather than erroring on an upstream miss, so the dropdown just
 *    shows "no results".
 *
 * Both modes return 400 for an empty query and 500 when the token is missing
 * / Mapbox throws.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // `limit` > 1 switches into suggestions mode (an array of matches). Cap it so
  // a caller can't ask Mapbox for an unbounded list.
  const rawLimit = Number(searchParams.get("limit"));
  const suggestMode = Number.isFinite(rawLimit) && rawLimit > 1;
  const limit = suggestMode ? Math.min(Math.floor(rawLimit), 10) : 1;

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Geocoding is unavailable" },
      { status: 500 },
    );
  }

  const encoded = encodeURIComponent(q);
  const autocomplete = suggestMode ? "&autocomplete=true" : "";
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=us&limit=${limit}${autocomplete}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // In suggestions mode an upstream miss is just "no matches yet" — degrade
      // to an empty list so the dropdown stays quiet instead of erroring.
      return suggestMode
        ? NextResponse.json({ suggestions: [] })
        : NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    const data = await res.json();
    const features: MapboxFeature[] = Array.isArray(data?.features)
      ? data.features
      : [];

    if (suggestMode) {
      const suggestions = features
        .filter((f) => Array.isArray(f.center))
        .map((f) => {
          const [lng, lat] = f.center as [number, number];
          return { lat, lng, placeName: f.place_name ?? q };
        });
      return NextResponse.json({ suggestions });
    }

    const feature = features[0];
    if (!feature || !Array.isArray(feature.center)) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    const [lng, lat] = feature.center;
    return NextResponse.json({
      lat,
      lng,
      placeName: feature.place_name ?? q,
    });
  } catch (error) {
    console.error("Error geocoding location:", error);
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
