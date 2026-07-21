import UtvParksApp from "@/components/ui/OffroadParksApp";
import {
  parseParkFilterParams,
  searchParamsToURLSearchParams,
} from "@/lib/park-filters";
import { getParkFacets, getParkMarkers, getParkPage } from "@/lib/park-query";

// Force dynamic rendering to always show fresh data
export const dynamic = "force-dynamic";

interface PageProps {
  // Next.js 16 App Router: searchParams is an async prop.
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ searchParams }: PageProps) {
  // Parse the real request query string so deep-linked / shared filtered URLs
  // (e.g. `/?state=Arkansas`) server-render the correctly filtered first page
  // and marker set. The client seeds its Filters panel from the same URL, so
  // the mount state matches what was rendered here (no filtered/unfiltered
  // flicker). Saved-preference-only filters (not in the URL) are applied on the
  // client after mount, which triggers a page-0 refetch.
  const resolved = (await searchParams) ?? {};
  const params = parseParkFilterParams(searchParamsToURLSearchParams(resolved));

  const [initialPage, initialMarkers, facets] = await Promise.all([
    getParkPage(params, 0),
    getParkMarkers(params),
    getParkFacets(),
  ]);

  return (
    <UtvParksApp
      initialData={initialPage}
      initialMarkers={initialMarkers}
      facets={facets}
    />
  );
}
