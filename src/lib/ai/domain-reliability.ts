import { prisma } from "@/lib/prisma";

/**
 * Look up domain-level reliability for a URL.
 * Match rules: exact domain match first, then suffix match (e.g. ".gov").
 * Returns null if no matching domain entry exists.
 */
export async function getDomainReliability(
  url: string
): Promise<{ reliability: number; isBlocked: boolean } | null> {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }

  // Fetch all domain entries — table is small, so this is fine
  const domains = await prisma.domainReliability.findMany();

  // Pass 1: exact match (e.g. "riderplanet-usa.com")
  for (const domain of domains) {
    const pattern = domain.domainPattern.toLowerCase();
    if (pattern === hostname) {
      return {
        reliability: domain.defaultReliability,
        isBlocked: domain.isBlocked,
      };
    }
  }

  // Pass 2: suffix match (e.g. ".gov" matches "blm.gov")
  // Pick the longest matching suffix for specificity
  let bestMatch: (typeof domains)[number] | null = null;
  for (const domain of domains) {
    const pattern = domain.domainPattern.toLowerCase();
    if (pattern.startsWith(".") && hostname.endsWith(pattern)) {
      if (!bestMatch || pattern.length > bestMatch.domainPattern.length) {
        bestMatch = domain;
      }
    }
  }

  if (bestMatch) {
    return {
      reliability: bestMatch.defaultReliability,
      isBlocked: bestMatch.isBlocked,
    };
  }

  return null;
}

/**
 * Get the default reliability score for a source URL.
 * Returns the domain-level default if found, 50 otherwise.
 * Blocked domains return 0.
 */
export async function getDefaultReliabilityForSource(
  url: string
): Promise<number> {
  const result = await getDomainReliability(url);
  if (!result) return 50;
  if (result.isBlocked) return 0;
  return result.reliability;
}
