import type { DataSourceType } from "@/lib/types";

type DiscoveredSource = {
  url: string;
  title: string;
  type: DataSourceType;
};

/**
 * Search the web for data sources about a park using Google Custom Search API.
 * Returns an empty array if API keys are not configured (graceful degradation).
 */
export async function discoverSources(
  parkName: string,
  state: string,
  existingUrls: string[]
): Promise<DiscoveredSource[]> {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;

  if (!apiKey || !cx) {
    return [];
  }

  const existingSet = new Set(existingUrls.map(normalizeUrl));

  const queries = [
    `"${parkName}" ${state} OHV off-road park`,
    `"${parkName}" ${state} trail fees hours amenities`,
  ];

  const allResults: DiscoveredSource[] = [];

  for (const query of queries) {
    const results = await searchGoogle(query, apiKey, cx);
    for (const result of results) {
      const normalized = normalizeUrl(result.url);
      if (!existingSet.has(normalized)) {
        existingSet.add(normalized);
        allResults.push(result);
      }
    }
  }

  return allResults.slice(0, 10);
}

async function searchGoogle(
  query: string,
  apiKey: string,
  cx: string
): Promise<DiscoveredSource[]> {
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: "5",
  });

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?${params}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const items = data.items || [];

    return items.map(
      (item: { link: string; title: string; displayLink: string }) => ({
        url: item.link,
        title: item.title || "",
        type: classifyDomain(item.displayLink || item.link),
      })
    );
  } catch {
    return [];
  }
}

function classifyDomain(urlOrDomain: string): DataSourceType {
  const domain = urlOrDomain.toLowerCase();

  if (domain.includes(".gov")) return "governmentPage";
  if (domain.includes("facebook.com") || domain.includes("fb.com"))
    return "facebook";
  if (
    domain.includes("recreation.gov") ||
    domain.includes("reserveamerica.com") ||
    domain.includes("campground") ||
    domain.includes("koa.com")
  )
    return "campingDirectory";
  if (
    domain.includes("alltrails.com") ||
    domain.includes("tripadvisor.com") ||
    domain.includes("yelp.com")
  )
    return "reviewSite";
  if (domain.endsWith(".pdf")) return "pdf";

  return "website";
}

/**
 * Normalize a URL for deduplication: remove trailing slashes,
 * tracking parameters, and standardize www.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }

    // Remove trailing slash
    parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";

    // Standardize www
    parsed.hostname = parsed.hostname.replace(/^www\./, "");

    return parsed.toString();
  } catch {
    return url;
  }
}
