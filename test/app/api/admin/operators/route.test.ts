import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/operators/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operator: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    operatorUser: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const admin = { user: { id: "admin-1", role: "ADMIN" } };

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/operators", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/operators", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", role: "USER" } } as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns operator list for ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operator.findMany).mockResolvedValue([
      { id: "op-1", name: "Acme", email: "a@b.com" } as any,
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.operators).toHaveLength(1);
  });
});

describe("POST /api/admin/operators", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(jsonRequest({ name: "A", email: "a@b.com" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const res = await POST(jsonRequest({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const res = await POST(jsonRequest({ name: "A", email: "not-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when initialParkSlug doesn't exist", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    const res = await POST(
      jsonRequest({
        name: "A",
        email: "a@b.com",
        initialParkSlug: "missing",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 409 when initialParkSlug already has an operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      operatorId: "existing-op",
    } as any);
    const res = await POST(
      jsonRequest({
        name: "A",
        email: "a@b.com",
        initialParkSlug: "claimed",
      }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 when email is already used by another operator (P2002)", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "x",
      }),
    );
    const res = await POST(
      jsonRequest({ name: "A", email: "dupe@b.com" }),
    );
    expect(res.status).toBe(409);
  });

  it("creates operator + attaches park + creates OperatorUser when all provided", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      operatorId: null,
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "user-7" } as any);

    const txMocks = {
      operator: { create: vi.fn().mockResolvedValue({ id: "op-new" }) },
      operatorUser: { create: vi.fn() },
      park: { update: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(txMocks));
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({
      id: "op-new",
      parks: [],
      users: [],
    } as any);

    const res = await POST(
      jsonRequest({
        name: "Acme",
        email: "owner@acme.com",
        initialParkSlug: "test-park",
        initialOwnerEmail: "owner@acme.com",
      }),
    );

    expect(res.status).toBe(201);
    expect(txMocks.operator.create).toHaveBeenCalledWith({
      data: { name: "Acme", email: "owner@acme.com", phone: null, website: null },
    });
    expect(txMocks.operatorUser.create).toHaveBeenCalledWith({
      data: { operatorId: "op-new", userId: "user-7", role: "OWNER" },
    });
    expect(txMocks.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { operatorId: "op-new" },
    });
  });

  it("creates operator with no park/user when neither is provided", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    const txMocks = {
      operator: { create: vi.fn().mockResolvedValue({ id: "op-new" }) },
      operatorUser: { create: vi.fn() },
      park: { update: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(txMocks));
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({
      id: "op-new",
      parks: [],
      users: [],
    } as any);

    const res = await POST(jsonRequest({ name: "A", email: "a@b.com" }));

    expect(res.status).toBe(201);
    expect(txMocks.operatorUser.create).not.toHaveBeenCalled();
    expect(txMocks.park.update).not.toHaveBeenCalled();
  });

  it("returns hint when initialOwnerEmail user doesn't exist (no error)", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const txMocks = {
      operator: { create: vi.fn().mockResolvedValue({ id: "op-new" }) },
      operatorUser: { create: vi.fn() },
      park: { update: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(txMocks));
    vi.mocked(prisma.operator.findUnique).mockResolvedValue({ id: "op-new" } as any);

    const res = await POST(
      jsonRequest({
        name: "A",
        email: "a@b.com",
        initialOwnerEmail: "future@user.com",
      }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.hints.ownerEmailSkipped).toContain("future@user.com");
    expect(txMocks.operatorUser.create).not.toHaveBeenCalled();
  });
});
