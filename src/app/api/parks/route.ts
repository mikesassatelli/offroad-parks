import { NextResponse } from "next/server";
import { parseParkFilterParams, PARK_PAGE_SIZE } from "@/lib/park-filters";
import { getParkPage } from "@/lib/park-query";

// Filtering depends on the request query string, so responses must not be
// statically cached.
export const dynamic = "force-dynamic";

/**
 * Paginated, server-filtered park list for the home page.
 *
 * Accepts every filter the UI supports (see `buildParkQueryString`) plus a
 * zero-based `page` (and optional `pageSize`). Returns one page of fully
 * card-shaped parks together with pagination metadata:
 *
 *   { parks: Park[], hasMore: boolean, nextPage: number | null, total: number }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = parseParkFilterParams(searchParams);

    const pageRaw = Number(searchParams.get("page") ?? "0");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 0;

    const pageSizeRaw = Number(
      searchParams.get("pageSize") ?? String(PARK_PAGE_SIZE),
    );
    const pageSize =
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.min(Math.floor(pageSizeRaw), 100)
        : PARK_PAGE_SIZE;

    const result = await getParkPage(params, page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching parks:", error);
    return NextResponse.json(
      { error: "Failed to fetch parks" },
      { status: 500 },
    );
  }
}
