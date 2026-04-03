import type { DataSourceType } from "@/lib/types";

type DiscoveredSource = {
  url: string;
  title: string;
  type: DataSourceType;
};

/**
 * Search the web for data sources about a park using SerpApi.
 * Returns an empty array if the API key is not configured (graceful degradation).
 */
export async function discoverSources(
  parkName: string,
  state: string,
  existingUrls: string[]
): Promise<DiscoveredSource[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    return [];
  }

  const existingSet = new Set(existingUrls.map(normalizeUrl));

  const queries = [
    `"${parkName}" ${state} OHV off-road park`,
    `"${parkName}" ${state} trail fees hours amenities`,
  ];

  const allResults: DiscoveredSource[] = [];

  for (const query of queries) {
    const results = await searchSerpApi(query, apiKey);
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

async function searchSerpApi(
  query: string,
  apiKey: string
): Promise<DiscoveredSource[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: query,
    num: "5",
  });

  try {
    const response = await fetch(
      `https://serpapi.com/search.json?${params}`,
      { signal: AbortSignal.timeout(10_000) }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const results = data.organic_results || [];

    return results.map(
      (item: { link: string; title: string; displayed_link?: string }) => ({
        url: item.link,
        title: item.title || "",
        type: classifyDomain(item.displayed_link || item.link),
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
