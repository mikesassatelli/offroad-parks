import { NextRequest } from "next/server";
import { POST } from "@/app/api/parks/[slug]/claim/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    parkClaim: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const mockPark = {
  id: "park-123",
  name: "Test Park",
  status: "APPROVED",
  operatorId: null,
};

const validBody = {
  claimantName: "Jane Smith",
  claimantEmail: "jane@example.com",
};

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/parks/test-park/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/parks/[slug]/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const response = await POST(makeRequest(validBody), {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when park not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const response = await POST(makeRequest(validBody), {
      params: Promise.resolve({ slug: "nonexistent-park" }),
    });

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe("Park not found");
  });

  it("should return 400 when park is not approved", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockPark,
      status: "PENDING",
    });

    const response = await POST(makeRequest(validBody), {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Park is not available for claiming");
  });

  it("should return 409 when park already has an operator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockPark,
      operatorId: "operator-123",
    });

    const response = await POST(makeRequest(validBody), {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("This park is already managed by an operator");
  });

  it("should return 409 when user already submitted a claim", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkClaim.findUnique as any).mockResolvedValue({
      id: "claim-existing",
      status: "PENDING",
    });

    const response = await POST(makeRequest(validBody), {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("You have already submitted a claim for this park");
  });

  it("should return 400 when required fields are missing", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);

    const response = await POST(makeRequest({ claimantName: "Jane" }), {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Name and email are required");
  });

  it("should return 201 with claim on successful submission", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);
    (prisma.parkClaim.create as any).mockResolvedValue({
      id: "claim-new",
      status: "PENDING",
      claimantName: "Jane Smith",
      claimantEmail: "jane@example.com",
      createdAt: new Date(),
    });

    const response = await POST(
      makeRequest({
        ...validBody,
        claimantPhone: "(555) 555-5555",
        businessName: "Desert Riders",
        message: "I am the owner",
      }),
      { params: Promise.resolve({ slug: "test-park" }) }
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.claim.id).toBe("claim-new");
    expect(data.claim.status).toBe("PENDING");
  });

  it("should return 400 on invalid JSON body", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: "test-park" }),
    });

    expect(response.status).toBe(400);
  });
});
