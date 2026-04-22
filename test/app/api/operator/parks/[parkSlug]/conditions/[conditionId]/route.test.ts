import { NextRequest } from "next/server";
import {
  PATCH,
  DELETE,
} from "@/app/api/operator/parks/[parkSlug]/conditions/[conditionId]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    trailCondition: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const session = { user: { id: "user-1" } };

const mockParkWithOperator = {
  id: "park-1",
  operator: { users: [{ role: "OWNER" }] },
};
const mockParkWithoutOperator = {
  id: "park-1",
  operator: { users: [] },
};

function makePatchRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/operator/parks/test-park/conditions/cond-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/operator/parks/[parkSlug]/conditions/[conditionId] (moderation)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await PATCH(makePatchRequest({ reportStatus: "PUBLISHED" }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not an operator of the park", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithoutOperator as any);

    const res = await PATCH(makePatchRequest({ reportStatus: "PUBLISHED" }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 404 when the condition belongs to a different park (cross-park access denied)", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithOperator as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      id: "cond-1",
      parkId: "other-park",
    } as any);

    const res = await PATCH(makePatchRequest({ reportStatus: "PUBLISHED" }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.trailCondition.update).not.toHaveBeenCalled();
  });

  it("rejects invalid reportStatus values", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithOperator as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      id: "cond-1",
      parkId: "park-1",
    } as any);

    const res = await PATCH(makePatchRequest({ reportStatus: "DENIED" }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("approves a pending condition report owned by the operator's park", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithOperator as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      id: "cond-1",
      parkId: "park-1",
    } as any);
    vi.mocked(prisma.trailCondition.update).mockResolvedValue({
      id: "cond-1",
      parkId: "park-1",
      reportStatus: "PUBLISHED",
    } as any);

    const res = await PATCH(makePatchRequest({ reportStatus: "PUBLISHED" }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.trailCondition.update).toHaveBeenCalledWith({
      where: { id: "cond-1" },
      data: { reportStatus: "PUBLISHED" },
    });
  });

  it("still supports the existing pinnedUntil update path", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithOperator as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      id: "cond-1",
      parkId: "park-1",
    } as any);
    vi.mocked(prisma.trailCondition.update).mockResolvedValue({
      id: "cond-1",
      parkId: "park-1",
      pinnedUntil: null,
    } as any);

    const res = await PATCH(makePatchRequest({ pinnedUntil: null }), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.trailCondition.update).toHaveBeenCalledWith({
      where: { id: "cond-1" },
      data: { pinnedUntil: null },
    });
  });
});

describe("DELETE /api/operator/parks/[parkSlug]/conditions/[conditionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses deletion for cross-park condition", async () => {
    vi.mocked(auth).mockResolvedValue(session as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockParkWithOperator as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      id: "cond-1",
      parkId: "other-park",
    } as any);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", conditionId: "cond-1" }),
    });

    expect(res.status).toBe(404);
    expect(prisma.trailCondition.delete).not.toHaveBeenCalled();
  });
});
