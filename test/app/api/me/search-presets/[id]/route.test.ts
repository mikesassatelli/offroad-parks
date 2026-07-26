import { DELETE, PATCH } from "@/app/api/me/search-presets/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearchFilter: {
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function patchReq(body: unknown) {
  return new Request("http://test/api/me/search-presets/p1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/me/search-presets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await PATCH(patchReq({ name: "New" }), params("p1"));
    expect(res.status).toBe(401);
  });

  it("400s when the body updates nothing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    const res = await PATCH(patchReq({}), params("p1"));
    expect(res.status).toBe(400);
  });

  it("404s when the preset isn't the caller's", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.findFirst).mockResolvedValue(null);

    const res = await PATCH(patchReq({ name: "New" }), params("p1"));
    expect(res.status).toBe(404);
    expect(prisma.savedSearchFilter.update).not.toHaveBeenCalled();
    // Ownership is enforced in the lookup.
    expect(prisma.savedSearchFilter.findFirst).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
      select: { id: true },
    });
  });

  it("renames an owned preset", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.findFirst).mockResolvedValue({
      id: "p1",
    } as any);
    vi.mocked(prisma.savedSearchFilter.update).mockResolvedValue({
      id: "p1",
      name: "New",
      filters: {},
      updatedAt: new Date(),
    } as any);

    const res = await PATCH(patchReq({ name: "New" }), params("p1"));
    expect(res.status).toBe(200);
    expect(prisma.savedSearchFilter.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { name: "New" },
      }),
    );
  });
});

describe("DELETE /api/me/search-presets/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("401s when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await DELETE(new Request("http://test"), params("p1"));
    expect(res.status).toBe(401);
  });

  it("404s when nothing was deleted (not owner / missing)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.deleteMany).mockResolvedValue({
      count: 0,
    } as any);

    const res = await DELETE(new Request("http://test"), params("p1"));
    expect(res.status).toBe(404);
  });

  it("deletes an owned preset scoped by userId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1" } } as any);
    vi.mocked(prisma.savedSearchFilter.deleteMany).mockResolvedValue({
      count: 1,
    } as any);

    const res = await DELETE(new Request("http://test"), params("p1"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(prisma.savedSearchFilter.deleteMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "u1" },
    });
  });
});
