import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import sitemap from "@/app/sitemap";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
    },
  },
}));

describe("sitemap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes static routes and one entry per approved park", async () => {
    const updatedAt = new Date("2026-06-01T00:00:00Z");
    vi.mocked(prisma.park.findMany).mockResolvedValue([
      { slug: "moab-trails", updatedAt },
      { slug: "glamis-dunes", updatedAt },
    ] as any);

    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    // Static routes are present.
    expect(urls).toContain(`${SITE_URL}/`);
    expect(urls).toContain(`${SITE_URL}/reviews`);
    expect(urls).toContain(`${SITE_URL}/submit`);
    expect(urls).toContain(`${SITE_URL}/legal/privacy`);
    expect(urls).toContain(`${SITE_URL}/legal/terms`);

    // Each approved park has a slug-based URL with its lastModified date.
    expect(urls).toContain(`${SITE_URL}/parks/moab-trails`);
    expect(urls).toContain(`${SITE_URL}/parks/glamis-dunes`);
    const park = entries.find((e) => e.url === `${SITE_URL}/parks/moab-trails`);
    expect(park?.lastModified).toEqual(updatedAt);
  });

  it("only queries APPROVED parks", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([] as any);

    await sitemap();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "APPROVED" } }),
    );
  });

  it("returns just the static routes when there are no parks", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([] as any);

    const entries = await sitemap();

    expect(entries).toHaveLength(5);
  });
});
