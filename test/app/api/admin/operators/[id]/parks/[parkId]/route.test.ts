import { DELETE } from "@/app/api/admin/operators/[id]/parks/[parkId]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const admin = { user: { id: "admin-1", role: "ADMIN" } };
const params = {
  params: Promise.resolve({ id: "op-1", parkId: "park-1" }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DELETE /api/admin/operators/[id]/parks/[parkId]", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(401);
  });

  it("returns 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(404);
  });

  it("returns 409 when park is owned by a different operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      slug: "p",
      operatorId: "other-op",
    } as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(409);
  });

  it("detaches the park when it belongs to this operator", async () => {
    vi.mocked(auth).mockResolvedValue(admin as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "park-1",
      slug: "p",
      operatorId: "op-1",
    } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({} as any);
    const res = await DELETE(new Request("http://localhost"), params);
    expect(res.status).toBe(200);
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { operatorId: null },
    });
  });
});
