/**
 * Simple robots.txt checker. Caches results per origin for the
 * duration of a research session (in-memory).
 */

const robotsCache = new Map<string, string[]>();

/**
 * Check if a URL is allowed by the site's robots.txt.
 * Returns true if crawling is allowed, false if disallowed.
 * On fetch failure (404, timeout, etc.), assumes allowed.
 */
export async function isAllowedByRobots(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const origin = parsed.origin;
  const path = parsed.pathname;

  let disallowedPaths = robotsCache.get(origin);

  if (!disallowedPaths) {
    disallowedPaths = await fetchDisallowedPaths(origin);
    robotsCache.set(origin, disallowedPaths);
  }

  return !disallowedPaths.some(
    (disallowed) => path === disallowed || path.startsWith(disallowed)
  );
}

async function fetchDisallowedPaths(origin: string): Promise<string[]> {
  try {
    const response = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return [];

    const text = await response.text();
    return parseRobotsTxt(text);
  } catch {
    // On any error (timeout, network, etc.), assume allowed
    return [];
  }
}

/**
 * Parse robots.txt and extract Disallow paths for User-agent: *
 */
function parseRobotsTxt(content: string): string[] {
  const lines = content.split("\n");
  const disallowed: string[] = [];
  let inWildcardAgent = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("#") || line === "") continue;

    const lowerLine = line.toLowerCase();

    if (lowerLine.startsWith("user-agent:")) {
      const agent = line.slice("user-agent:".length).trim();
      inWildcardAgent = agent === "*";
      continue;
    }

    if (inWildcardAgent && lowerLine.startsWith("disallow:")) {
      const path = line.slice("disallow:".length).trim();
      if (path) {
        disallowed.push(path);
      }
    }
  }

  return disallowed;
}

/** Clear the robots.txt cache (useful between research sessions). */
export function clearRobotsCache(): void {
  robotsCache.clear();
}
