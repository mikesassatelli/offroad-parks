import { NextRequest } from "next/server";
import { PATCH, DELETE } from "@/app/api/operator/parks/[parkSlug]/photos/[photoId]/route";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operator-auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkPhoto: {
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
  operatorName: "Test Operator",
  parkId: "park-1",
  parkName: "Test Park",
  parkSlug: "test-park",
  role: "OWNER",
};

const ownPhoto = {
  id: "photo-1",
  parkId: "park-1",
  url: "https://example.com/photo.jpg",
  status: "PENDING",
  caption: null,
  createdAt: new Date(),
  userId: "user-2",
};

const otherParkPhoto = { ...ownPhoto, id: "photo-2", parkId: "other-park" };

function makePatchRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/operator/parks/test-park/photos/photo-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/operator/parks/[parkSlug]/photos/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user is not an operator for this park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 403 when operator tries to moderate a different park's photo", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(otherParkPhoto as any);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-2" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.parkPhoto.update).not.toHaveBeenCalled();
  });

  it("returns 404 when photo not found", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("returns 400 when status is invalid", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);

    const res = await PATCH(makePatchRequest({ status: "BAD" }), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("approves a photo belonging to the operator's park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(ownPhoto as any);
    vi.mocked(prisma.parkPhoto.update).mockResolvedValue({
      ...ownPhoto,
      status: "APPROVED",
    } as any);

    const res = await PATCH(makePatchRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.parkPhoto.update).toHaveBeenCalledWith({
      where: { id: "photo-1" },
      data: { status: "APPROVED" },
    });
  });
});

describe("DELETE /api/operator/parks/[parkSlug]/photos/[photoId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when not an operator", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(null);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("refuses to delete a photo that belongs to a different park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(otherParkPhoto as any);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-2" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.parkPhoto.delete).not.toHaveBeenCalled();
  });

  it("deletes a photo owned by the operator's park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(ownPhoto as any);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(ownPhoto as any);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ parkSlug: "test-park", photoId: "photo-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.parkPhoto.delete).toHaveBeenCalledWith({ where: { id: "photo-1" } });
  });
});
