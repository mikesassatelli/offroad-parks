import { POST } from "@/app/api/admin/pre-grants/[id]/apply/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { applyPreGrant } from "@/lib/pre-grant";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userPreGrant: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("@/lib/pre-grant", () => ({
  applyPreGrant: vi.fn(),
}));

const superAdmin = { user: { id: "super-1", role: "SUPER_ADMIN" } };
const regularAdmin = { user: { id: "admin-1", role: "ADMIN" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/pre-grants/[id]/apply", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-super-admin", async () => {
    vi.mocked(auth).mockResolvedValue(regularAdmin as any);
    const res = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when grant is not found", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue(null);
    const res = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 409 when no user exists for the grant email yet", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue({
      id: "pg-1",
      email: "tester@example.com",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });

    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toContain("has not signed in yet");
  });

  it("invokes applyPreGrant when the user exists and returns the result", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue({
      id: "pg-1",
      email: "tester@example.com",
    } as any);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-7",
    } as any);
    vi.mocked(applyPreGrant).mockResolvedValue({
      status: "applied",
      grantedRole: "ADMIN",
      operatorParkSlug: null,
      operatorId: null,
    });

    const res = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.result.status).toBe("applied");
    expect(applyPreGrant).toHaveBeenCalledWith({
      email: "tester@example.com",
      userId: "user-7",
    });
  });
});
