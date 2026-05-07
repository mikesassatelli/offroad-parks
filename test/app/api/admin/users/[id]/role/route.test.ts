import { PATCH } from "@/app/api/admin/users/[id]/role/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const superAdmin = { user: { id: "super-1", role: "SUPER_ADMIN" } };

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/users/u1/role", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "u1" }) };

describe("PATCH /api/admin/users/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await PATCH(makeRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 when caller is a regular ADMIN (not super admin)", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    });
    const res = await PATCH(makeRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON body", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    const res = await PATCH(makeRequest("{not json"), params);
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid role", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    const res = await PATCH(makeRequest({ role: "ROOT" }), params);
    expect(res.status).toBe(400);
  });

  it("rejects super admin demoting themselves", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    const res = await PATCH(makeRequest({ role: "ADMIN" }), {
      params: Promise.resolve({ id: "super-1" }),
    });
    expect(res.status).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("returns 404 when target user does not exist", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );
    const res = await PATCH(makeRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(404);
  });

  it("promotes a user to ADMIN", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      role: "USER",
    });
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      name: "User",
      role: "ADMIN",
    });

    const res = await PATCH(makeRequest({ role: "ADMIN" }), params);
    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { role: "ADMIN" },
      select: { id: true, email: true, name: true, role: true },
    });
    const body = await res.json();
    expect(body.role).toBe("ADMIN");
  });

  it("allows super admin to confirm their own role (no-op)", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(superAdmin);
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super-1",
      role: "SUPER_ADMIN",
    });
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "super-1",
      email: "super@example.com",
      name: "Super",
      role: "SUPER_ADMIN",
    });

    const res = await PATCH(makeRequest({ role: "SUPER_ADMIN" }), {
      params: Promise.resolve({ id: "super-1" }),
    });
    expect(res.status).toBe(200);
  });
});
