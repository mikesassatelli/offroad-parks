import { generateMapHero } from "@/lib/map-hero/generate";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

// Stub global fetch per test
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

describe("generateMapHero", () => {
  const ORIGINAL_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "pk.test-token";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = ORIGINAL_TOKEN;
  });

  it("returns not-ok when NEXT_PUBLIC_MAPBOX_TOKEN is missing", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const result = await generateMapHero("park-1");

    expect(result).toEqual({ ok: false, reason: "NEXT_PUBLIC_MAPBOX_TOKEN not set" });
    expect(prisma.park.findUnique).not.toHaveBeenCalled();
  });

  it("returns not-ok when park is missing", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const result = await generateMapHero("nope");

    expect(result).toEqual({ ok: false, reason: "park not found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not-ok when park has no coordinates on park or address", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      latitude: null,
      longitude: null,
      address: { latitude: null, longitude: null },
    } as any);

    const result = await generateMapHero("park-1");

    expect(result).toEqual({ ok: false, reason: "no coordinates" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to address.latitude/longitude when park root lat/lng are missing", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      latitude: null,
      longitude: null,
      address: { latitude: 36.575, longitude: -98.905 },
    } as any);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.mocked(put).mockResolvedValue({
      url: "https://blob.vercel-storage.com/parks/park-1/map-hero.jpg",
    } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const result = await generateMapHero("park-1");

    expect(result.ok).toBe(true);
    const fetchedUrl = fetchMock.mock.calls[0][0] as string;
    expect(fetchedUrl).toContain("-98.905,36.575");
  });

  it("returns not-ok when Mapbox responds with non-OK status", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      latitude: 34.631,
      longitude: -94.183,
      address: null,
    } as any);
    fetchMock.mockResolvedValue({ ok: false, status: 429 });

    const result = await generateMapHero("park-1");

    expect(result).toEqual({ ok: false, reason: "mapbox 429" });
    expect(put).not.toHaveBeenCalled();
  });

  it("uploads to Blob and updates the park on success", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      latitude: 34.631,
      longitude: -94.183,
      address: null,
    } as any);
    const imageBuffer = new ArrayBuffer(16);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(imageBuffer),
    });
    const blobUrl = "https://blob.vercel-storage.com/parks/park-1/map-hero.jpg";
    vi.mocked(put).mockResolvedValue({ url: blobUrl } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const result = await generateMapHero("park-1");

    expect(result).toEqual({ ok: true, url: blobUrl });

    // Blob upload uses correct path + options
    expect(put).toHaveBeenCalledWith(
      "parks/park-1/map-hero.jpg",
      expect.any(Buffer),
      expect.objectContaining({
        access: "public",
        contentType: "image/jpeg",
        allowOverwrite: true,
      }),
    );

    // Park record updated with URL + timestamp
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: expect.objectContaining({
        mapHeroUrl: blobUrl,
        mapHeroGeneratedAt: expect.any(Date),
      }),
    });
  });

  it("builds the Mapbox URL with the outdoors-v12 style at zoom 10 @2x", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      latitude: 34.631,
      longitude: -94.183,
      address: null,
    } as any);
    fetchMock.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.mocked(put).mockResolvedValue({ url: "https://blob.example/map.jpg" } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    await generateMapHero("park-1");

    const fetchedUrl = fetchMock.mock.calls[0][0] as string;
    expect(fetchedUrl).toContain("/styles/v1/mapbox/outdoors-v12/static/");
    expect(fetchedUrl).toContain("-94.183,34.631,10");
    expect(fetchedUrl).toContain("600x300@2x");
    expect(fetchedUrl).toContain("access_token=pk.test-token");
  });
});
