import { PATCH, DELETE } from "@/app/api/admin/operators/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operator: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const admin = { user: { id: "admin-1", role: "ADMIN" } };

function patchReq(body: unknown) {
  return new Request("http://localhost/api/admin/operators/op-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "op-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/admin/operators/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await PATCH(patchReq({ name: "X" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u", role: "USER" } } as any);
    const res = await PATCH(patchReq({ name: "X" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 404 when operator not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue(null);
    const res = await PATCH(patchReq({ name: "X" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 400 when no editable fields are present", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    const res = await PATCH(patchReq({ unrelated: "x" }), params);
    expect(res.status).toBe(400);
  });

  it("rejects empty name", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    const res = await PATCH(patchReq({ name: "   " }), params);
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    const res = await PATCH(patchReq({ email: "not-email" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 409 on email uniqueness conflict (P2002)", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.operator.update).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const res = await PATCH(patchReq({ email: "taken@example.com" }), params);
    expect(res.status).toBe(409);
  });

  it("updates valid fields", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.operator.update).mockResolvedValue({
      id: "op-1",
      name: "New Name",
      email: "new@e.com",
    } as any);
    const res = await PATCH(
      patchReq({
        name: "New Name",
        email: "NEW@e.com",
        phone: "555",
        website: "",
      }),
      params,
    );
    expect(res.status).toBe(200);
    expect(prisma.operator.update).toHaveBeenCalledWith({
      where: { id: "op-1" },
      data: {
        name: "New Name",
        email: "new@e.com",
        phone: "555",
        website: null,
      },
    });
  });
});

describe("DELETE /api/admin/operators/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when operator not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("deletes the operator for ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.operator.delete).mockResolvedValue({} as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(prisma.operator.delete).toHaveBeenCalledWith({ where: { id: "op-1" } });
  });
});
