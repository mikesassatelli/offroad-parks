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
  noiseLimitDBA: null,
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
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 200 with no-change message when nothing changed", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    // Send same values — no changes
    const response = await PATCH(
      makePatchRequest({ name: "Test Park", dayPassUSD: 25 }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("No changes detected");
  });

  it("should update park and write audit log via transaction", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: {
          update: vi.fn().mockResolvedValue({ ...mockPark, name: "Updated Park Name" }),
        },
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

  it("should return park data for authorized operator", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.park.name).toBe("Test Park");
  });
});
