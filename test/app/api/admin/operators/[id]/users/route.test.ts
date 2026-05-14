import { POST } from "@/app/api/admin/operators/[id]/users/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operator: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    operatorUser: { create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const admin = { user: { id: "admin-1", role: "ADMIN" } };

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/admin/operators/op-1/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "op-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/operators/[id]/users", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(makeRequest({ email: "x@y.com" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 400 when email is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const res = await POST(makeRequest({ email: "nope" }), params);
    expect(res.status).toBe(400);
  });

  it("returns 400 when role is not OWNER/MEMBER", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const res = await POST(
      makeRequest({ email: "x@y.com", role: "ADMIN" }),
      params,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when operator does not exist", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "x@y.com" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 404 with helpful message when user hasn't signed in yet", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: "new@user.com" }), params);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/pre-grant/i);
  });

  it("returns 409 when user is already a member (P2002)", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-1" } as any);
    vi.mocked(prisma.operatorUser.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("dup", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const res = await POST(makeRequest({ email: "x@y.com" }), params);
    expect(res.status).toBe(409);
  });

  it("creates OperatorUser with role OWNER by default", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-1" } as any);
    vi.mocked(prisma.operatorUser.create).mockResolvedValue({
      id: "ou-1",
      role: "OWNER",
      user: { id: "u-1", email: "x@y.com", name: null, image: null },
    } as any);
    const res = await POST(makeRequest({ email: "x@y.com" }), params);
    expect(res.status).toBe(201);
    expect(prisma.operatorUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { operatorId: "op-1", userId: "u-1", role: "OWNER" },
      }),
    );
  });

  it("creates OperatorUser with explicit MEMBER role when provided", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-1" } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u-1" } as any);
    vi.mocked(prisma.operatorUser.create).mockResolvedValue({
      id: "ou-2",
      role: "MEMBER",
      user: { id: "u-1", email: "x@y.com", name: null, image: null },
    } as any);
    const res = await POST(
      makeRequest({ email: "x@y.com", role: "MEMBER" }),
      params,
    );
    expect(res.status).toBe(201);
    expect(prisma.operatorUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { operatorId: "op-1", userId: "u-1", role: "MEMBER" },
      }),
    );
  });
});
