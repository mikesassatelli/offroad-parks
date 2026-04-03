import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractFromHtml, extractContent } from "@/lib/ai/content-extractor";

describe("extractFromHtml", () => {
  it("should extract text content from basic HTML", () => {
    const html = `
      <html>
        <head><title>Test Park</title></head>
        <body><p>Welcome to Test Park</p></body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Welcome to Test Park");
    expect(result.title).toBe("Test Park");
  });

  it("should strip script tags", () => {
    const html = `
      <html>
        <body>
          <p>Visible content</p>
          <script>var x = "hidden";</script>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Visible content");
    expect(result.text).not.toContain("hidden");
    expect(result.text).not.toContain("script");
  });

  it("should strip style tags", () => {
    const html = `
      <html>
        <body>
          <style>.cls { color: red; }</style>
          <p>Styled content</p>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Styled content");
    expect(result.text).not.toContain("color");
  });

  it("should strip navigation elements", () => {
    const html = `
      <html>
        <body>
          <nav><a href="/">Home</a><a href="/about">About</a></nav>
          <p>Main content</p>
          <footer>Footer info</footer>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Main content");
    expect(result.text).not.toContain("Home");
    expect(result.text).not.toContain("Footer info");
  });

  it("should strip header elements", () => {
    const html = `
      <html>
        <body>
          <header><h1>Site Header</h1></header>
          <main><p>Main content</p></main>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Main content");
    expect(result.text).not.toContain("Site Header");
  });

  it("should strip aside and iframe elements", () => {
    const html = `
      <html>
        <body>
          <aside>Sidebar</aside>
          <iframe src="ad.html">Ad content</iframe>
          <p>Real content</p>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Real content");
    expect(result.text).not.toContain("Sidebar");
  });

  it("should strip hidden elements", () => {
    const html = `
      <html>
        <body>
          <div aria-hidden="true">Screen reader hidden</div>
          <div style="display:none">CSS hidden</div>
          <div style="display: none">CSS hidden with space</div>
          <p>Visible</p>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.text).toContain("Visible");
    expect(result.text).not.toContain("Screen reader hidden");
    expect(result.text).not.toContain("CSS hidden");
  });

  it("should collapse excessive whitespace", () => {
    const html = `
      <html>
        <body>
          <p>First    paragraph     here</p>
          <p>Second paragraph</p>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    // Multiple spaces collapsed to single space
    expect(result.text).not.toMatch(/  /);
  });

  it("should produce a consistent content hash for same input", () => {
    const html = "<html><body><p>Test content</p></body></html>";
    const result1 = extractFromHtml(html);
    const result2 = extractFromHtml(html);
    expect(result1.contentHash).toBe(result2.contentHash);
    expect(result1.contentHash).toHaveLength(64); // SHA-256 hex
  });

  it("should produce different hashes for different content", () => {
    const result1 = extractFromHtml("<html><body>Content A</body></html>");
    const result2 = extractFromHtml("<html><body>Content B</body></html>");
    expect(result1.contentHash).not.toBe(result2.contentHash);
  });

  it("should return null title when no title tag exists", () => {
    const html = "<html><body><p>No title</p></body></html>";
    const result = extractFromHtml(html);
    expect(result.title).toBeNull();
  });

  it("should handle empty HTML", () => {
    const result = extractFromHtml("<html><body></body></html>");
    expect(result.text).toBe("");
    expect(result.contentHash).toHaveLength(64);
  });

  it("should truncate very long content and append marker", () => {
    // Generate content longer than MAX_CONTENT_CHARS
    const longContent = "A".repeat(50_000);
    const html = `<html><body><p>${longContent}</p></body></html>`;
    const result = extractFromHtml(html);
    expect(result.text).toContain("[Content truncated]");
    expect(result.text.length).toBeLessThan(50_000);
  });

  it("should compute hash on full text before truncation", () => {
    const longContent = "B".repeat(50_000);
    const html = `<html><body><p>${longContent}</p></body></html>`;
    const result = extractFromHtml(html);
    // Hash should be based on full content, not truncated
    const shortContent = "B".repeat(100);
    const shortHtml = `<html><body><p>${shortContent}</p></body></html>`;
    const shortResult = extractFromHtml(shortHtml);
    expect(result.contentHash).not.toBe(shortResult.contentHash);
  });

  it("should handle a realistic park webpage", () => {
    const html = `
      <html>
        <head><title>Busted Nutz Offroad Park - Texas OHV</title></head>
        <body>
          <nav><a href="/">Home</a><a href="/parks">Parks</a></nav>
          <header><div class="logo">OffroadParks.com</div></header>
          <main>
            <h1>Busted Nutz Offroad Park</h1>
            <p>Located in Crosby, Texas, Busted Nutz offers over 200 acres of trails.</p>
            <p>Day pass: $25 per vehicle. Open weekends year-round.</p>
            <ul>
              <li>ATV trails</li>
              <li>SxS friendly</li>
              <li>Camping available</li>
            </ul>
          </main>
          <footer><p>Copyright 2024</p></footer>
          <script>analytics.track('pageview');</script>
        </body>
      </html>
    `;
    const result = extractFromHtml(html);
    expect(result.title).toBe("Busted Nutz Offroad Park - Texas OHV");
    expect(result.text).toContain("Busted Nutz Offroad Park");
    expect(result.text).toContain("200 acres");
    expect(result.text).toContain("$25 per vehicle");
    expect(result.text).toContain("ATV trails");
    // Should NOT contain nav, footer, or script content
    expect(result.text).not.toContain("OffroadParks.com");
    expect(result.text).not.toContain("Copyright");
    expect(result.text).not.toContain("analytics");
  });
});

describe("extractContent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch URL and extract content", async () => {
    const html =
      "<html><head><title>Park Page</title></head><body><p>Park info here</p></body></html>";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(html),
      })
    );

    const result = await extractContent("https://example.com/park");
    expect(result.title).toBe("Park Page");
    expect(result.text).toContain("Park info here");
    expect(result.contentHash).toHaveLength(64);
  });

  it("should throw on non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      })
    );

    await expect(
      extractContent("https://example.com/missing")
    ).rejects.toThrow("Failed to fetch");
  });

  it("should send appropriate User-Agent header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve("<html><body>Test</body></html>"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await extractContent("https://example.com/park");

    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[1].headers["User-Agent"]).toContain("OffroadParksBot");
  });

  it("should propagate network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network timeout"))
    );

    await expect(
      extractContent("https://example.com/park")
    ).rejects.toThrow("Network timeout");
  });
});
