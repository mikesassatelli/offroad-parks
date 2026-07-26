import { GET, POST } from "@/app/api/me/search-presets/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PRESETS } from "@/lib/search-preferences";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearchFilter: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const validFilters = {
  selectedState: "CA",
  selectedTerrains: ["sand"],
  selectedAmenities: [],
  selectedCamping: [],
  selectedVehicleTypes: ["sxs"],
  minTrailMiles: 10,
  minAcres: 0,
  minRating: "4",
  selectedOwnership: "public",
  permitRequired: "yes",
  membershipRequired: "",
  flagsRequired: "no",
  sparkArrestorRequired: "",
};

function postReq(body: unknown) {
  return new Request("http://test/api/me/search-presets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/me/search-presets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(prisma.savedSearchFilter.findMany).not.toHaveBeenCalled();
  });

  it("returns the user's presets newest-first", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.findMany).mockResolvedValue([
      { id: "p1", name: "Sand", filters: validFilters, updatedAt: new Date() },
    ] as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.presets).toHaveLength(1);
    expect(prisma.savedSearchFilter.findMany).toHaveBeenCalledWith({
      where: { userId: "u1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, filters: true, updatedAt: true },
    });
  });
});

describe("POST /api/me/search-presets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(postReq({ name: "X", filters: validFilters }));
    expect(res.status).toBe(401);
    expect(prisma.savedSearchFilter.create).not.toHaveBeenCalled();
  });

  it("400s on an invalid payload (missing name)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const res = await POST(postReq({ filters: validFilters }));
    expect(res.status).toBe(400);
    expect(prisma.savedSearchFilter.create).not.toHaveBeenCalled();
  });

  it("400s on a blank name", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const res = await POST(postReq({ name: "   ", filters: validFilters }));
    expect(res.status).toBe(400);
  });

  it("creates a preset and returns 201", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.count).mockResolvedValue(2 as any);
    vi.mocked(prisma.savedSearchFilter.create).mockResolvedValue({
      id: "p1",
      name: "Sand",
      filters: validFilters,
      updatedAt: new Date(),
    } as any);

    const res = await POST(postReq({ name: "  Sand  ", filters: validFilters }));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.preset.id).toBe("p1");
    // Name is trimmed by the schema before persistence.
    expect(prisma.savedSearchFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "u1", name: "Sand" }),
      }),
    );
  });

  it("409s when the per-user cap is reached", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.count).mockResolvedValue(
      MAX_PRESETS as any,
    );

    const res = await POST(postReq({ name: "Sand", filters: validFilters }));
    expect(res.status).toBe(409);
    expect(prisma.savedSearchFilter.create).not.toHaveBeenCalled();
  });

  it("409s on a duplicate name (unique constraint)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.count).mockResolvedValue(1 as any);
    vi.mocked(prisma.savedSearchFilter.create).mockRejectedValue({
      code: "P2002",
    });

    const res = await POST(postReq({ name: "Sand", filters: validFilters }));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toMatch(/name/i);
  });
});
