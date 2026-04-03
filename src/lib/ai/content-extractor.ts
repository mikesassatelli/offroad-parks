import * as cheerio from "cheerio";
import { createHash } from "crypto";
import { MAX_CONTENT_CHARS } from "./config";

export type ExtractedContent = {
  text: string;
  contentHash: string;
  title: string | null;
};

/**
 * Fetch a URL, extract meaningful text content, and compute a content hash.
 * Strips navigation, scripts, styles, and other non-content elements.
 */
export async function extractContent(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: {
      "User-Agent":
        "OffroadParksBot/1.0 (data research; https://offroadparks.com)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return extractFromHtml(html);
}

/**
 * Extract text and metadata from an HTML string. Exported for testing.
 */
export function extractFromHtml(html: string): ExtractedContent {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $(
    "script, style, nav, footer, header, aside, iframe, noscript, svg, form"
  ).remove();

  // Remove hidden elements
  $("[aria-hidden=true], [style*='display:none'], [style*='display: none']").remove();

  // Extract title
  const title = $("title").first().text().trim() || null;

  // Extract text from body
  const rawText = $("body").text();

  // Collapse whitespace: multiple spaces/tabs to single space, multiple newlines to double
  const text = rawText
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Hash the full text (before truncation) for change detection
  const contentHash = createHash("sha256").update(text).digest("hex");

  // Truncate for LLM context
  const truncated =
    text.length > MAX_CONTENT_CHARS
      ? text.slice(0, MAX_CONTENT_CHARS) + "\n\n[Content truncated]"
      : text;

  return { text: truncated, contentHash, title };
}
