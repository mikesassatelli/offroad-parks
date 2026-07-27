import { NextResponse } from "next/server";

// Depends on the request query string, so it must never be statically cached.
export const dynamic = "force-dynamic";

/**
 * GET /api/geocode?q=…
 *
 * Server-side forward geocoding via Mapbox. Lets the home page turn a typed
 * location ("Denver, CO", "90210") into coordinates that feed the existing
 * "distance-nearest" coords channel — without the client hitting Mapbox
 * directly.
 *
 * Returns `{ lat, lng, placeName }` on a hit, 404 when nothing matches, 400
 * for an empty query, and 500 when the token is missing / Mapbox errors.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Geocoding is unavailable" },
      { status: 500 },
    );
  }

  const encoded = encodeURIComponent(q);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${token}&country=us&limit=1`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature || !Array.isArray(feature.center)) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }
    const [lng, lat] = feature.center as [number, number];
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
