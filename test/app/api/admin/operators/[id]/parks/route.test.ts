import { POST } from "@/app/api/admin/operators/[id]/parks/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operator: { findUnique: vi.fn() },
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const admin = { user: { id: "admin-1", role: "ADMIN" } };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/operators/op-1/parks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "op-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/operators/[id]/parks", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(makeRequest({ parkSlug: "p" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 400 when parkSlug is missing", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const res = await POST(makeRequest({}), params);
    expect(res.status).toBe(400);
  });

  it("returns 404 when operator not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ parkSlug: "p" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ parkSlug: "missing" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 200 idempotently when park is already attached to this operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      slug: "p",
      name: "P",
      operatorId: "op-1",
    } as any);
    const res = await POST(makeRequest({ parkSlug: "p" }), params);
    expect(res.status).toBe(200);
    expect(prisma.park.update).not.toHaveBeenCalled();
  });

  it("returns 409 when park is owned by a different operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      slug: "p",
      name: "P",
      operatorId: "other-op",
    } as any);
    const res = await POST(makeRequest({ parkSlug: "p" }), params);
    expect(res.status).toBe(409);
  });

  it("attaches the park when it has no operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      slug: "p",
      name: "P",
      operatorId: null,
    } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({
      id: "park-1",
      slug: "p",
      name: "P",
      operatorId: "op-1",
    } as any);

    const res = await POST(makeRequest({ parkSlug: "p" }), params);
    expect(res.status).toBe(201);
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { operatorId: "op-1" },
      select: expect.any(Object),
    });
  });
});
