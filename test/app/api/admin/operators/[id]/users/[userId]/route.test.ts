import { DELETE } from "@/app/api/admin/operators/[id]/users/[userId]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operatorUser: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const admin = { user: { id: "admin-1", role: "ADMIN" } };
const params = {
  params: Promise.resolve({ id: "op-1", userId: "u-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/admin/operators/[id]/users/[userId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when membership not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operatorUser.findUnique).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("deletes the membership for ADMIN", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.operatorUser.findUnique).mockResolvedValue({ id: "ou-1" } as any);
    vi.mocked(prisma.operatorUser.delete).mockResolvedValue({} as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(prisma.operatorUser.delete).toHaveBeenCalledWith({
      where: { operatorId_userId: { operatorId: "op-1", userId: "u-1" } },
    });
  });
});
