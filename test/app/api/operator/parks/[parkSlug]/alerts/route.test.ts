import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/operator/parks/[parkSlug]/alerts/route";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operator-auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkAlert: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/operator-auth", () => ({
  getOperatorContext: vi.fn(),
}));

const operatorCtx = {
  userId: "user-1",
  operatorId: "op-1",
  operatorName: "Ops Co",
  parkId: "park-1",
  parkName: "Test Park",
  parkSlug: "test-park",
  role: "OWNER",
};

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/operator/parks/test-park/alerts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/operator/parks/[parkSlug]/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when getOperatorContext returns null (unauthorized / non-operator)", async () => {
    (getOperatorContext as any).mockResolvedValue(null);

    const response = await POST(makePostRequest({ title: "A" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 400 when title is missing", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);

    const response = await POST(makePostRequest({ title: "" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when severity is invalid", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);

    const response = await POST(
      makePostRequest({ title: "Closure", severity: "CATACLYSM" }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when expiresAt is before startsAt", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);

    const response = await POST(
      makePostRequest({
        title: "Event",
        startsAt: "2026-05-05T00:00:00Z",
        expiresAt: "2026-05-01T00:00:00Z",
      }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(400);
  });

  it("creates an alert scoped to the operator's park and current user", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.create as any).mockResolvedValue({
      id: "alert-1",
      title: "Closure",
      severity: "WARNING",
    });

    const response = await POST(
      makePostRequest({
        title: "  Closure  ",
        body: "North gate closed",
        severity: "WARNING",
      }),
      { params: Promise.resolve({ parkSlug: "test-park" }) }
    );

    expect(response.status).toBe(201);
    expect(prisma.parkAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          parkId: "park-1",
          userId: "user-1",
          title: "Closure",
          body: "North gate closed",
          severity: "WARNING",
        }),
      })
    );
  });

  it("defaults severity to INFO when omitted", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.create as any).mockResolvedValue({ id: "alert-2" });

    const response = await POST(makePostRequest({ title: "Hello" }), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(201);
    expect(prisma.parkAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ severity: "INFO" }),
      })
    );
  });
});

describe("GET /api/operator/parks/[parkSlug]/alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-operators", async () => {
    (getOperatorContext as any).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns alerts scoped to the operator's park", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findMany as any).mockResolvedValue([
      {
        id: "alert-1",
        title: "Closure",
        body: null,
        severity: "DANGER",
        startsAt: null,
        expiresAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "Op" },
      },
    ]);

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.alerts).toHaveLength(1);
    expect(prisma.parkAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ parkId: "park-1" }),
      })
    );
  });
});
