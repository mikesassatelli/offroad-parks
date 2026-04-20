import { DELETE, GET, PUT } from "@/app/api/me/search-preferences/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userSearchPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const validFilters = {
  selectedState: "CA",
  selectedTerrains: ["sand", "rocks"],
  selectedAmenities: ["restrooms"],
  selectedCamping: ["tent"],
  selectedVehicleTypes: ["atv", "sxs"],
  minTrailMiles: 10,
  minAcres: 500,
  minRating: "4",
  selectedOwnership: "public",
  permitRequired: "yes",
  membershipRequired: "",
  flagsRequired: "no",
  sparkArrestorRequired: "",
};

describe("GET /api/me/search-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.userSearchPreference.findUnique).not.toHaveBeenCalled();
  });

  it("returns null body when user has no saved preference", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.userSearchPreference.findUnique).mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeNull();
    expect(prisma.userSearchPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });

  it("returns the saved filters when present", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const updatedAt = new Date("2026-04-01T12:00:00Z");
    vi.mocked(prisma.userSearchPreference.findUnique).mockResolvedValue({
      id: "pref-1",
      userId: "u1",
      filters: validFilters,
      createdAt: new Date("2026-04-01T00:00:00Z"),
      updatedAt,
    } as any);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.filters).toEqual(validFilters);
    expect(body.updatedAt).toBe(updatedAt.toISOString());
  });
});

describe("PUT /api/me/search-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeReq(body: unknown): Request {
    return new Request("http://localhost/api/me/search-preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  }

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await PUT(makeReq({ filters: validFilters }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.userSearchPreference.upsert).not.toHaveBeenCalled();
  });

  it("returns 400 when JSON is malformed", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const res = await PUT(makeReq("not json"));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid JSON");
  });

  it("returns 400 when filters payload is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const res = await PUT(makeReq({}));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid filters payload");
  });

  it("returns 400 when filters shape is invalid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);

    const res = await PUT(
      makeReq({
        filters: { ...validFilters, permitRequired: "maybe" },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Invalid filters payload");
  });

  it("upserts the preference and returns the saved filters", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const updatedAt = new Date("2026-04-15T00:00:00Z");
    vi.mocked(prisma.userSearchPreference.upsert).mockResolvedValue({
      id: "pref-1",
      userId: "u1",
      filters: validFilters,
      createdAt: new Date("2026-04-01T00:00:00Z"),
      updatedAt,
    } as any);

    const res = await PUT(makeReq({ filters: validFilters }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.filters).toEqual(validFilters);
    expect(body.updatedAt).toBe(updatedAt.toISOString());
    expect(prisma.userSearchPreference.upsert).toHaveBeenCalledWith({
      where: { userId: "u1" },
      create: { userId: "u1", filters: validFilters },
      update: { filters: validFilters },
    });
  });
});

describe("DELETE /api/me/search-preferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(prisma.userSearchPreference.delete).not.toHaveBeenCalled();
  });

  it("deletes the preference for the authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.userSearchPreference.delete).mockResolvedValue({} as any);

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prisma.userSearchPreference.delete).toHaveBeenCalledWith({
      where: { userId: "u1" },
    });
  });

  it("is idempotent when no preference exists (P2025)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.userSearchPreference.delete).mockRejectedValue(
      Object.assign(new Error("No row"), { code: "P2025" }),
    );

    const res = await DELETE();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
  });

  it("propagates unexpected prisma errors", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.userSearchPreference.delete).mockRejectedValue(
      Object.assign(new Error("boom"), { code: "P2000" }),
    );

    await expect(DELETE()).rejects.toThrow("boom");
  });
});
