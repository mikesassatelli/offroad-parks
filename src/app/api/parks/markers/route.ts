import { NextResponse } from "next/server";
import { parseParkFilterParams } from "@/lib/park-filters";
import { getParkMarkers } from "@/lib/park-query";

// Filtering depends on the request query string, so responses must not be
// statically cached.
export const dynamic = "force-dynamic";

/**
 * Lightweight map markers for the home page's map view.
 *
 * Accepts the SAME filters as the list endpoint (see `buildParkQueryString`)
 * but returns ALL matching parks — the map needs the full filtered set — as a
 * minimal projection (id/slug, name, coords, and the fields the popup renders).
 * No pagination, no hero/weather decoration, so the payload stays small.
 *
 *   { parks: Park[] }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseParkFilterParams(searchParams);
    const parks = await getParkMarkers(params);
    return NextResponse.json({ parks });
  } catch (error) {
    console.error("Error fetching park markers:", error);
    return NextResponse.json(
      { error: "Failed to fetch park markers" },
      { status: 500 },
    );
  }
}
