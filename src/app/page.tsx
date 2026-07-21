import UtvParksApp from "@/components/ui/OffroadParksApp";
import { parseParkFilterParams } from "@/lib/park-filters";
import { getParkFacets, getParkMarkers, getParkPage } from "@/lib/park-query";

// Force dynamic rendering to always show fresh data
export const dynamic = "force-dynamic";

export default async function Page() {
  // Server-render the first page (with hero images + rain badges), the full
  // filtered marker set, and the static filter facets. The client takes over
  // for infinite scroll + filter changes. Default (unfiltered, name-sorted)
  // params drive the first paint; saved-default filters (if any) re-query on
  // the client after mount.
  const params = parseParkFilterParams(new URLSearchParams());

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
