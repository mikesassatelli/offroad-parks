import { generateObject } from "ai";
import { EXTRACTION_MODEL } from "./config";
import { parkCandidateSchema } from "./discovery-schemas";
import type { DiscoveredParkCandidate } from "./discovery-schemas";
import { prisma } from "@/lib/prisma";
import { normalizeStateName } from "@/lib/us-states";

// ── Levenshtein distance (standard DP) ───────────────────────────────────────

export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Use a single-row DP approach for space efficiency
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost // substitution
      );
    }
    // Swap rows
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }

  return prev[n];
}

// ── Name normalization ───────────────────────────────────────────────────────

const STRIP_SUFFIXES =
  /\b(off[\s-]?road|offroad|ohv|atv|utv|sxs|park|area|riding|trails?|recreation|recreational)\b/gi;

export function normalizeParkName(name: string): string {
  return name
    .toLowerCase()
    .replace(STRIP_SUFFIXES, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Fuzzy dedup check ────────────────────────────────────────────────────────

function isFuzzyDuplicate(
  candidateName: string,
  existingName: string
): boolean {
  const a = normalizeParkName(candidateName);
  const b = normalizeParkName(existingName);

  if (a === b) return true;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);

  // Threshold: <= 3 for names under 20 chars, <= 5 for longer
  const threshold = maxLen < 20 ? 3 : 5;
  return distance <= threshold;
}

// ── SerpApi search (matches source-discovery.ts pattern) ─────────────────────

type SearchResult = {
  title: string;
  snippet: string;
  link: string;
};

async function searchSerpApi(
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    api_key: apiKey,
    engine: "google",
    q: query,
    num: "10",
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
      (item: { link: string; title: string; snippet?: string }) => ({
        title: item.title || "",
        snippet: item.snippet || "",
        link: item.link,
      })
    );
  } catch {
    return [];
  }
}

// ── Main discovery function ──────────────────────────────────────────────────

export async function discoverParksInState(state: string): Promise<{
  candidates: Array<{
    name: string;
    state: string;
    city: string | null;
    estimatedLat: number | null;
    estimatedLng: number | null;
    sourceUrl: string | null;
  }>;
  inputTokens: number;
  outputTokens: number;
}> {
  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) {
    throw new Error("SERPAPI_API_KEY is not configured");
  }

  // Callers may pass a 2-letter code or a full name — normalize so we always
  // store the canonical full name on candidates/addresses.
  const canonicalState = normalizeStateName(state);
  if (!canonicalState) {
    throw new Error(`Unknown US state: "${canonicalState}"`);
  }

  // 1. Run 3 searches in parallel
  // Avoid exact-match quotes — they're too restrictive for discovery
  const queries = [
    `off-road parks ${canonicalState} OHV`,
    `OHV riding areas ${canonicalState} ATV UTV`,
    `${canonicalState} off-road trails open to public`,
  ];

  const searchResults = await Promise.all(
    queries.map((q) => searchSerpApi(q, apiKey))
  );

  const allResults = searchResults.flat();

  if (allResults.length === 0) {
    return { candidates: [], inputTokens: 0, outputTokens: 0 };
  }

  // 2. Build snippet text for LLM extraction
  const snippetText = allResults
    .map(
      (r, i) =>
        `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`
    )
    .join("\n\n");

  const systemPrompt =
    "You are identifying distinct off-road/OHV parks from web search results. Extract every unique park mentioned. Only include parks that appear to be real, named off-road riding areas (not private land, not individual trails within a park, not stores/dealers). Deduplicate — if the same park appears in multiple results, include it only once.";

  const userPrompt = `Extract all distinct off-road/OHV parks found in these search results for ${canonicalState}:\n\n${snippetText}`;

  const result = await generateObject({
    model: EXTRACTION_MODEL,
    schema: parkCandidateSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const extracted: DiscoveredParkCandidate[] = result.object.parks;
  const inputTokens = result.usage?.inputTokens ?? 0;
  const outputTokens = result.usage?.outputTokens ?? 0;

  // 3. Fuzzy dedup against existing parks and candidates
  const [existingParks, existingCandidates] = await Promise.all([
    prisma.park.findMany({
      where: { address: { state: canonicalState } },
      select: { name: true },
    }),
    prisma.parkCandidate.findMany({
      where: { state: canonicalState },
      select: { name: true },
    }),
  ]);

  const existingNames = [
    ...existingParks.map((p) => p.name),
    ...existingCandidates.map((c) => c.name),
  ];

  const dedupedCandidates: Array<{
    name: string;
    state: string;
    city: string | null;
    estimatedLat: number | null;
    estimatedLng: number | null;
    sourceUrl: string | null;
  }> = [];

  for (const candidate of extracted) {
    const isDuplicate = existingNames.some((existing) =>
      isFuzzyDuplicate(candidate.name, existing)
    );

    if (isDuplicate) continue;

    // Also check against already-accepted candidates in this batch
    const isBatchDuplicate = dedupedCandidates.some((c) =>
      isFuzzyDuplicate(candidate.name, c.name)
    );

    if (isBatchDuplicate) continue;

    dedupedCandidates.push({
      name: candidate.name,
      // The Zod schema already normalizes `candidate.state`, but pin it to
      // the caller's target state to be completely safe — the discovery
      // search is scoped to `canonicalState`, so a candidate attributed to
      // a different state is almost certainly a hallucination.
      state: canonicalState,
      city: candidate.city ?? null,
      estimatedLat: candidate.estimatedLat ?? null,
      estimatedLng: candidate.estimatedLng ?? null,
      sourceUrl: candidate.sourceUrl ?? null,
    });
  }

  // 4. Persist non-duplicate candidates
  if (dedupedCandidates.length > 0) {
    await prisma.parkCandidate.createMany({
      data: dedupedCandidates,
      skipDuplicates: true,
    });
  }

  return {
    candidates: dedupedCandidates,
    inputTokens,
    outputTokens,
  };
}
