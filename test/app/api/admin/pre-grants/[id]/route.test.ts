import { DELETE } from "@/app/api/admin/pre-grants/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userPreGrant: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const superAdmin = { user: { id: "super-1", role: "SUPER_ADMIN" } };
const regularAdmin = { user: { id: "admin-1", role: "ADMIN" } };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/admin/pre-grants/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-super-admin", async () => {
    vi.mocked(auth).mockResolvedValue(regularAdmin as any);
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when grant doesn't exist", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("deletes a pre-grant for SUPER_ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue(superAdmin as any);
    vi.mocked(prisma.userPreGrant.findUnique).mockResolvedValue({
      id: "pg-1",
    } as any);
    vi.mocked(prisma.userPreGrant.delete).mockResolvedValue({} as any);

    const res = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "pg-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.userPreGrant.delete).toHaveBeenCalledWith({
      where: { id: "pg-1" },
    });
  });
});
