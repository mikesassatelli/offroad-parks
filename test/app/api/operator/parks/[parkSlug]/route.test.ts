import { NextRequest } from "next/server";
import { PATCH, GET } from "@/app/api/operator/parks/[parkSlug]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    parkTerrain: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    parkAmenity: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    parkCamping: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    parkVehicleType: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    parkEditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const operatorSession = { user: { id: "user-1" } };

const mockPark = {
  id: "park-1",
  name: "Test Park",
  slug: "test-park",
  website: "https://test.com",
  phone: null,
  campingWebsite: null,
  campingPhone: null,
  notes: "Great park",
  datesOpen: null,
  contactEmail: null,
  isFree: false,
  dayPassUSD: 25,
  vehicleEntryFeeUSD: null,
  riderFeeUSD: null,
  membershipFeeUSD: null,
  milesOfTrails: 50,
  acres: 1000,
  permitRequired: null,
  permitType: null,
  membershipRequired: null,
  maxVehicleWidthInches: null,
  flagsRequired: null,
  sparkArrestorRequired: null,
  helmetsRequired: null,
  noiseLimitDBA: null,
  terrain: [{ terrain: "sand" }, { terrain: "rocks" }],
  amenities: [{ amenity: "restrooms" }],
  camping: [],
  vehicleTypes: [{ vehicleType: "atv" }],
  operator: { users: [{ role: "OWNER" }] },
};

function makePatchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/operator/parks/test-park", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/operator/parks/[parkSlug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: "New Name" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 when park not found", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ name: "New Name" }), {
      params: Promise.resolve({ parkSlug: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 when user is not an operator for this park", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockPark,
      operator: { users: [] },
    });

    const response = await PATCH(makePatchRequest({ name: "New Name" }), {
      params: Promise.resolve({ parkSlug: "test-park" }) ,
    });

    expect(response.status).toBe(403);
  });

  it("should return 200 with no-change message when nothing changed", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    // Send same scalar values and same arrays — no changes
    const response = await PATCH(
      makePatchRequest({
        name: "Test Park",
        dayPassUSD: 25,
        terrain: ["sand", "rocks"],
        amenities: ["restrooms"],
        camping: [],
        vehicleTypes: ["atv"],
      }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("No changes detected");
  });

  it("should update scalar fields and write audit log via transaction", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const updatedPark = {
      ...mockPark,
      name: "Updated Park Name",
    };

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: {
          update: vi.fn().mockResolvedValue(updatedPark),
          findUnique: vi.fn().mockResolvedValue(updatedPark),
        },
        parkTerrain: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkAmenity: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkCamping: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkVehicleType: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkEditLog: {
          create: vi.fn().mockResolvedValue({ id: "log-1" }),
        },
      });
    });

    const response = await PATCH(
      makePatchRequest({ name: "Updated Park Name" }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should ignore disallowed fields like status", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    // Only disallowed fields — should be treated as no changes
    const response = await PATCH(
      makePatchRequest({ status: "REJECTED", submitterId: "hack-user" }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("No changes detected");
  });

  it("should update array fields via transaction with deleteMany + createMany", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const txParkTerrain = { deleteMany: vi.fn(), createMany: vi.fn() };
    const txParkAmenity = { deleteMany: vi.fn(), createMany: vi.fn() };
    const updatedPark = { ...mockPark, terrain: [{ terrain: "mud" }] };

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: {
          update: vi.fn().mockResolvedValue(updatedPark),
          findUnique: vi.fn().mockResolvedValue(updatedPark),
        },
        parkTerrain: txParkTerrain,
        parkAmenity: txParkAmenity,
        parkCamping: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkVehicleType: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkEditLog: { create: vi.fn().mockResolvedValue({ id: "log-1" }) },
      });
    });

    const response = await PATCH(
      makePatchRequest({ terrain: ["mud"] }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    expect(txParkTerrain.deleteMany).toHaveBeenCalledWith({ where: { parkId: "park-1" } });
    expect(txParkTerrain.createMany).toHaveBeenCalledWith({
      data: [{ parkId: "park-1", terrain: "mud" }],
    });
    // Amenity not changed — should not be touched
    expect(txParkAmenity.deleteMany).not.toHaveBeenCalled();
  });

  it("should handle clearing all terrain by passing empty array", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const txParkTerrain = { deleteMany: vi.fn(), createMany: vi.fn() };
    const updatedPark = { ...mockPark, terrain: [] };

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: {
          update: vi.fn().mockResolvedValue(updatedPark),
          findUnique: vi.fn().mockResolvedValue(updatedPark),
        },
        parkTerrain: txParkTerrain,
        parkAmenity: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkCamping: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkVehicleType: { deleteMany: vi.fn(), createMany: vi.fn() },
        parkEditLog: { create: vi.fn().mockResolvedValue({ id: "log-1" }) },
      });
    });

    await PATCH(
      makePatchRequest({ terrain: [] }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(txParkTerrain.deleteMany).toHaveBeenCalledWith({ where: { parkId: "park-1" } });
    expect(txParkTerrain.createMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/operator/parks/[parkSlug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return park data with array fields transformed for authorized operator", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.park.name).toBe("Test Park");
    // Array relations should be transformed to string arrays
    expect(data.park.terrain).toEqual(["sand", "rocks"]);
    expect(data.park.amenities).toEqual(["restrooms"]);
    expect(data.park.camping).toEqual([]);
    expect(data.park.vehicleTypes).toEqual(["atv"]);
  });

  it("should not expose operator field in response", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    const data = await response.json();
    expect(data.park.operator).toBeUndefined();
  });

  it("should return 403 when user is not operator", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockPark,
      operator: { users: [] },
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(403);
  });
});
