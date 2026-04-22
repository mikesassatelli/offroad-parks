import { NextRequest } from "next/server";
import {
  PATCH,
  DELETE,
} from "@/app/api/operator/parks/[parkSlug]/alerts/[alertId]/route";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operator-auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkAlert: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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

function makePatchRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/operator/parks/test-park/alerts/alert-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

describe("PATCH /api/operator/parks/[parkSlug]/alerts/[alertId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-operators", async () => {
    (getOperatorContext as any).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ isActive: false }), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the alert does not exist", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue(null);

    const response = await PATCH(makePatchRequest({ isActive: false }), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "missing" }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 404 when the alert belongs to a different park (cross-park guard)", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue({
      id: "alert-other",
      parkId: "park-999",
    });

    const response = await PATCH(makePatchRequest({ isActive: false }), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-other" }),
    });

    expect(response.status).toBe(404);
    expect(prisma.parkAlert.update).not.toHaveBeenCalled();
  });

  it("toggles isActive on a happy path", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue({
      id: "alert-1",
      parkId: "park-1",
    });
    (prisma.parkAlert.update as any).mockResolvedValue({
      id: "alert-1",
      isActive: false,
    });

    const response = await PATCH(makePatchRequest({ isActive: false }), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.parkAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "alert-1" },
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("returns 400 when severity is invalid", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue({
      id: "alert-1",
      parkId: "park-1",
    });

    const response = await PATCH(makePatchRequest({ severity: "NUCLEAR" }), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-1" }),
    });

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/operator/parks/[parkSlug]/alerts/[alertId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for non-operators", async () => {
    (getOperatorContext as any).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("returns 404 when alert belongs to another park (cross-park guard)", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue({
      id: "alert-x",
      parkId: "park-999",
    });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-x" }),
    });

    expect(response.status).toBe(404);
    expect(prisma.parkAlert.delete).not.toHaveBeenCalled();
  });

  it("deletes the alert on the happy path", async () => {
    (getOperatorContext as any).mockResolvedValue(operatorCtx);
    (prisma.parkAlert.findUnique as any).mockResolvedValue({
      id: "alert-1",
      parkId: "park-1",
    });
    (prisma.parkAlert.delete as any).mockResolvedValue({ id: "alert-1" });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", alertId: "alert-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.parkAlert.delete).toHaveBeenCalledWith({ where: { id: "alert-1" } });
  });
});
