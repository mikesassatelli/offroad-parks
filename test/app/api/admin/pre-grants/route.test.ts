import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/admin/pre-grants/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userPreGrant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    park: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const superAdmin = { user: { id: "super-1", role: "SUPER_ADMIN" } };
const regularAdmin = { user: { id: "admin-1", role: "ADMIN" } };

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/pre-grants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/admin/pre-grants", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 403 when authenticated as plain ADMIN (not SUPER_ADMIN)", async () => {
    vi.mocked(auth).mockResolvedValue(regularAdmin as any);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns the pre-grant list for SUPER_ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findMany).mockResolvedValue([
      {
        id: "pg-1",
        email: "x@y.com",
        grantRole: "ADMIN",
        operatorParkSlug: null,
        appliedAt: null,
        appliedToUserId: null,
        notes: null,
        createdAt: new Date(),
        createdByUserId: null,
      },
    ] as any);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.grants).toHaveLength(1);
    expect(data.grants[0].email).toBe("x@y.com");
  });
});

describe("POST /api/admin/pre-grants", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(jsonRequest({ email: "x@y.com", grantRole: "ADMIN" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-super-admin", async () => {
    vi.mocked(auth).mockResolvedValue(regularAdmin as any);
    const res = await POST(jsonRequest({ email: "x@y.com", grantRole: "ADMIN" }));
    expect(res.status).toBe(403);
  });

  it("rejects invalid email", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    const res = await POST(jsonRequest({ email: "not-an-email", grantRole: "ADMIN" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid role", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    const res = await POST(
      jsonRequest({ email: "x@y.com", grantRole: "NOT_A_ROLE" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Invalid role");
  });

  it("rejects when neither role nor operator is provided", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    const res = await POST(jsonRequest({ email: "x@y.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects when operatorParkSlug doesn't exist", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    const res = await POST(
      jsonRequest({ email: "x@y.com", operatorParkSlug: "nope" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("not found");
  });

  it("rejects duplicate pre-grants", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue({
      id: "pg-exists",
    } as any);
    const res = await POST(
      jsonRequest({ email: "x@y.com", grantRole: "ADMIN" }),
    );
    expect(res.status).toBe(409);
  });

  it("creates a pre-grant with role only", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userPreGrant.create).mockResolvedValue({
      id: "pg-new",
      email: "x@y.com",
      grantRole: "ADMIN",
      operatorParkSlug: null,
    } as any);

    const res = await POST(
      jsonRequest({ email: "X@y.com", grantRole: "ADMIN" }),
    );

    expect(res.status).toBe(201);
    // Email gets normalized to lowercase.
    expect(prisma.userPreGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "x@y.com",
        grantRole: "ADMIN",
        operatorParkSlug: null,
        createdByUserId: "super-1",
      }),
    });
  });

  it("creates a pre-grant with role + operator slug after validating the park", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
    } as any);
    vi.mocked(prisma.userPreGrant.create).mockResolvedValue({
      id: "pg-new",
      email: "x@y.com",
    } as any);

    const res = await POST(
      jsonRequest({
        email: "x@y.com",
        grantRole: "ADMIN",
        operatorParkSlug: "test-park",
        notes: "hi",
      }),
    );

    expect(res.status).toBe(201);
    expect(prisma.userPreGrant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "x@y.com",
        grantRole: "ADMIN",
        operatorParkSlug: "test-park",
        notes: "hi",
      }),
    });
  });
});
