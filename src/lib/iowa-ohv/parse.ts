import * as cheerio from "cheerio";

/**
 * Iowa DNR "All Active OHV Alerts" page. Lists current closures / usage
 * limitations for state OHV parks. Server-rendered ASP.NET page with a stable,
 * class-based layout — each alert is a bordered `.p-2` box containing a
 * `.font-weight-bold` header (park name, "Effective:" date, status line, and
 * county) plus an optional `.pt-1` extended-description block.
 */
export const IOWA_OHV_ALERTS_URL =
  "https://programs.iowadnr.gov/parkforms/pages/ViewOHVAlerts";

export interface IowaOhvAlert {
  /** Park name exactly as printed, e.g. "Nicholson-Ford OHV Park". */
  parkName: string;
  /** County name without the "County" suffix, e.g. "Marshall". May be "". */
  county: string;
  /** Status heading, e.g. "PARK CLOSED" or "PARK OPEN BUT USE IS LIMITED". */
  statusLabel: string;
  /** Short reason printed after the status label, e.g. "Wet trail conditions". */
  reason: string;
  /** Extended description from the `.pt-1` block, if any. */
  extraBody: string;
  /** Raw "Effective:" date string as printed, e.g. "7/20/2026". */
  effectiveDate: string | null;
  /** True when the whole park is closed (vs. merely limited). */
  closed: boolean;
  /** True when the park is open but usage is restricted. */
  limited: boolean;
}

function stripCounty(text: string): string {
  return text.replace(/\bcounty\b/i, "").replace(/\s+/g, " ").trim();
}

/**
 * Parse the OHV alerts page HTML into structured alerts. Pure and testable —
 * `fetchIowaOhvAlerts` handles the network call.
 */
export function parseIowaOhvAlerts(html: string): IowaOhvAlert[] {
  const $ = cheerio.load(html);
  const alerts: IowaOhvAlert[] = [];

  $("div.p-2").each((_, box) => {
    const $box = $(box);
    const $header = $box.find("div.font-weight-bold").first();
    if ($header.length === 0) return;

    // The name/status block is the inline-block that is NOT the county float.
    const $nameBlock = $header
      .find("div.d-inline-block")
      .not(".float-right")
      .first();
    if ($nameBlock.length === 0) return;

    // Park name = leading text of the block, with the child <span>/<br> removed.
    const $nameOnly = $nameBlock.clone();
    $nameOnly.find("span, br").remove();
    const parkName = $nameOnly
      .text()
      .replace(/[-–—]\s*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!parkName) return;

    const spanTexts = $nameBlock
      .find("span")
      .map((_i, el) => $(el).text().trim())
      .get()
      .filter(Boolean);

    const effectiveRaw = spanTexts.find((s) => /effective/i.test(s)) ?? null;
    const effectiveDate = effectiveRaw
      ? effectiveRaw.replace(/effective:?/i, "").trim() || null
      : null;

    // Status line = the last non-"Effective" span (falls back to full text).
    const statusLine =
      [...spanTexts].reverse().find((s) => !/effective/i.test(s)) ?? "";

    const sep = statusLine.indexOf(" - ");
    const statusLabel = (sep >= 0 ? statusLine.slice(0, sep) : statusLine).trim();
    const reason = sep >= 0 ? statusLine.slice(sep + 3).trim() : "";

    const county = stripCounty($header.find(".float-right").first().text());
    const extraBody = $box
      .find("div.pt-1")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const closed = /\bclosed\b/i.test(statusLabel);
    const limited = !closed && /(limited|open but)/i.test(statusLabel);

    alerts.push({
      parkName,
      county,
      statusLabel,
      reason,
      extraBody,
      effectiveDate,
      closed,
      limited,
    });
  });

  return alerts;
}

/**
 * Fetch and parse the live Iowa DNR OHV alerts page.
 */
export async function fetchIowaOhvAlerts(
  url: string = IOWA_OHV_ALERTS_URL
): Promise<IowaOhvAlert[]> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: {
      "User-Agent":
        "OffroadParksBot/1.0 (park closure alerts; https://offroadparks.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Iowa OHV alerts: ${response.status} ${response.statusText}`
    );
  }

  return parseIowaOhvAlerts(await response.text());
}
