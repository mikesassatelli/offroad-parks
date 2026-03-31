import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/operator/parks/[parkSlug]/conditions/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    trailCondition: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const operatorSession = { user: { id: "user-1" } };

const mockParkWithOperator = {
  id: "park-1",
  name: "Test Park",
  operatorId: "op-1",
  operator: {
    users: [{ role: "OWNER" }],
  },
};

const mockParkNoOperator = {
  id: "park-1",
  name: "Test Park",
  operatorId: null,
  operator: null,
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/operator/parks/test-park/conditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/operator/parks/[parkSlug]/conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const response = await POST(makePostRequest({ status: "OPEN" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(401);
  });

  it("should return 404 when park not found", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const response = await POST(makePostRequest({ status: "OPEN" }), {
      params: Promise.resolve({ parkSlug: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 403 when user is not an operator for this park", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockParkWithOperator,
      operator: { users: [] }, // user is not a member
    });

    const response = await POST(makePostRequest({ status: "OPEN" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 400 when status is invalid", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockParkWithOperator);

    const response = await POST(makePostRequest({ status: "FOGGY" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(400);
  });

  it("should create an operator-flagged condition and return 201", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockParkWithOperator);
    (prisma.trailCondition.create as any).mockResolvedValue({
      id: "cond-1",
      status: "OPEN",
      note: "Great conditions today",
      isOperatorPost: true,
      reportStatus: "PUBLISHED",
      createdAt: new Date(),
    });

    const response = await POST(
      makePostRequest({ status: "OPEN", note: "Great conditions today" }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(prisma.trailCondition.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isOperatorPost: true,
          reportStatus: "PUBLISHED",
        }),
      })
    );
  });
});

describe("GET /api/operator/parks/[parkSlug]/conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when park has no operator", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockParkNoOperator);

    const response = await GET(
      new Request("http://localhost"),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(403);
  });

  it("should return conditions for authorized operator", async () => {
    (auth as any).mockResolvedValue(operatorSession);
    (prisma.park.findUnique as any).mockResolvedValue(mockParkWithOperator);
    (prisma.trailCondition.findMany as any).mockResolvedValue([
      {
        id: "cond-1",
        status: "OPEN",
        note: null,
        isOperatorPost: true,
        createdAt: new Date(),
        user: { id: "user-1", name: "Jane" },
      },
    ]);

    const response = await GET(
      new Request("http://localhost"),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.conditions).toHaveLength(1);
    expect(data.conditions[0].isOperatorPost).toBe(true);
  });
});
