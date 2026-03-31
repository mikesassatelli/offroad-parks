import { DELETE } from "@/app/api/admin/claims/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkClaim: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    park: {
      update: vi.fn(),
      count: vi.fn(),
    },
    operatorUser: {
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    operator: {
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

const makeClaim = (overrides = {}) => ({
  id: "claim-1",
  status: "PENDING",
  parkId: "park-1",
  userId: "user-1",
  claimantName: "Jane Smith",
  park: { id: "park-1", operatorId: null },
  ...overrides,
});

describe("DELETE /api/admin/claims/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1", role: "USER" } });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 404 when claim not found", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should delete a PENDING claim without touching operator data", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(makeClaim({ status: "PENDING" }));
    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: { update: vi.fn(), count: vi.fn() },
        operatorUser: { deleteMany: vi.fn(), count: vi.fn() },
        operator: { delete: vi.fn() },
        user: { findUnique: vi.fn(), update: vi.fn() },
        parkClaim: { delete: vi.fn().mockResolvedValue({}) },
      });
    });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("should clean up operator data when deleting an APPROVED claim", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(
      makeClaim({ status: "APPROVED", park: { id: "park-1", operatorId: "op-1" } })
    );

    const parkUpdate = vi.fn().mockResolvedValue({});
    const operatorUserDeleteMany = vi.fn().mockResolvedValue({});
    const parkCount = vi.fn().mockResolvedValue(0);
    const operatorUserCount = vi.fn().mockResolvedValue(0);
    const operatorDelete = vi.fn().mockResolvedValue({});
    const userFindUnique = vi.fn().mockResolvedValue({ role: "OPERATOR" });
    const userUpdate = vi.fn().mockResolvedValue({});
    const claimDelete = vi.fn().mockResolvedValue({});

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: { update: parkUpdate, count: parkCount },
        operatorUser: { deleteMany: operatorUserDeleteMany, count: operatorUserCount },
        operator: { delete: operatorDelete },
        user: { findUnique: userFindUnique, update: userUpdate },
        parkClaim: { delete: claimDelete },
      });
    });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(200);
    expect(parkUpdate).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { operatorId: null },
    });
    expect(operatorUserDeleteMany).toHaveBeenCalledWith({
      where: { operatorId: "op-1", userId: "user-1" },
    });
    expect(operatorDelete).toHaveBeenCalledWith({ where: { id: "op-1" } });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "USER" },
    });
  });

  it("should not revert role when user is ADMIN", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(
      makeClaim({ status: "APPROVED", park: { id: "park-1", operatorId: "op-1" } })
    );

    const userUpdate = vi.fn().mockResolvedValue({});

    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        park: { update: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(0) },
        operatorUser: { deleteMany: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(0) },
        operator: { delete: vi.fn().mockResolvedValue({}) },
        user: { findUnique: vi.fn().mockResolvedValue({ role: "ADMIN" }), update: userUpdate },
        parkClaim: { delete: vi.fn().mockResolvedValue({}) },
      });
    });

    await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(userUpdate).not.toHaveBeenCalled();
  });
});
