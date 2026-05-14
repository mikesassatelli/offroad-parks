import { applyPreGrant, applyPreGrantForNewUser } from "@/lib/pre-grant";
import { prisma } from "@/lib/prisma";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}));

// Build a tx mock with the same shape used by applyPreGrantTx.
function buildTx() {
  return {
    userPreGrant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    park: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    operator: {
      create: vi.fn(),
    },
    operatorUser: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyPreGrant", () => {
  it("returns no-grant when no UserPreGrant matches the email", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({
      email: "nobody@example.com",
      userId: "user-1",
    });

    expect(result).toEqual({ status: "no-grant" });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it("returns already-applied when appliedAt is set and does not double-apply", async () => {
    const tx = buildTx();
    const applied = new Date("2026-05-01T00:00:00Z");
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "x@y.com",
      grantRole: "ADMIN",
      operatorParkSlug: null,
      appliedAt: applied,
    });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({ email: "x@y.com", userId: "user-1" });

    expect(result).toEqual({ status: "already-applied", appliedAt: applied });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.userPreGrant.update).not.toHaveBeenCalled();
  });

  it("applies a role-only pre-grant (no operator wiring)", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "admin@example.com",
      grantRole: "ADMIN",
      operatorParkSlug: null,
      appliedAt: null,
    });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({
      email: "admin@example.com",
      userId: "user-1",
    });

    expect(result).toEqual({
      status: "applied",
      grantedRole: "ADMIN",
      operatorParkSlug: null,
      operatorId: null,
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "ADMIN" },
    });
    expect(tx.operator.create).not.toHaveBeenCalled();
    expect(tx.userPreGrant.update).toHaveBeenCalledWith({
      where: { id: "pg-1" },
      data: expect.objectContaining({
        appliedToUserId: "user-1",
        appliedAt: expect.any(Date),
      }),
    });
  });

  it("creates Operator + OperatorUser and sets Park.operatorId when park has no operator", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "op@example.com",
      grantRole: null,
      operatorParkSlug: "test-park",
      appliedAt: null,
    });
    tx.park.findUnique.mockResolvedValue({
      id: "park-1",
      slug: "test-park",
      operatorId: null,
      operator: null,
    });
    tx.user.findUnique.mockResolvedValue({
      email: "op@example.com",
      name: "Op Person",
    });
    tx.operator.create.mockResolvedValue({ id: "operator-1" });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({
      email: "op@example.com",
      userId: "user-2",
    });

    expect(result).toEqual({
      status: "applied",
      grantedRole: null,
      operatorParkSlug: "test-park",
      operatorId: "operator-1",
    });
    expect(tx.operator.create).toHaveBeenCalledWith({
      data: { name: "Op Person", email: "op@example.com" },
    });
    expect(tx.operatorUser.create).toHaveBeenCalledWith({
      data: { operatorId: "operator-1", userId: "user-2", role: "OWNER" },
    });
    expect(tx.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { operatorId: "operator-1" },
    });
    expect(tx.user.update).not.toHaveBeenCalled(); // grantRole was null
  });

  it("upserts OperatorUser without overwriting existing operator on a claimed park", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "op@example.com",
      grantRole: null,
      operatorParkSlug: "claimed-park",
      appliedAt: null,
    });
    tx.park.findUnique.mockResolvedValue({
      id: "park-9",
      slug: "claimed-park",
      operatorId: "existing-operator-7",
      operator: { id: "existing-operator-7" },
    });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({
      email: "op@example.com",
      userId: "user-3",
    });

    expect(result.status).toBe("applied");
    if (result.status !== "applied") throw new Error("type guard");
    expect(result.operatorId).toBe("existing-operator-7");
    expect(tx.operator.create).not.toHaveBeenCalled();
    expect(tx.park.update).not.toHaveBeenCalled();
    expect(tx.operatorUser.upsert).toHaveBeenCalledWith({
      where: {
        operatorId_userId: {
          operatorId: "existing-operator-7",
          userId: "user-3",
        },
      },
      update: {},
      create: {
        operatorId: "existing-operator-7",
        userId: "user-3",
        role: "OWNER",
      },
    });
  });

  it("returns park-not-found when operatorParkSlug does not resolve", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "x@y.com",
      grantRole: "ADMIN",
      operatorParkSlug: "missing-park",
      appliedAt: null,
    });
    tx.park.findUnique.mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({ email: "x@y.com", userId: "user-1" });

    expect(result).toEqual({
      status: "park-not-found",
      parkSlug: "missing-park",
    });
    // Role had been updated before we hit the park lookup; the wrapping
    // transaction would roll that back in real use. The unit only asserts
    // the return code.
  });

  it("applies both role and operator together when both fields are set", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "both@example.com",
      grantRole: "ADMIN",
      operatorParkSlug: "test-park",
      appliedAt: null,
    });
    tx.park.findUnique.mockResolvedValue({
      id: "park-1",
      slug: "test-park",
      operatorId: null,
      operator: null,
    });
    tx.user.findUnique.mockResolvedValue({
      email: "both@example.com",
      name: null,
    });
    tx.operator.create.mockResolvedValue({ id: "operator-2" });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    const result = await applyPreGrant({
      email: "both@example.com",
      userId: "user-4",
    });

    expect(result.status).toBe("applied");
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-4" },
      data: { role: "ADMIN" },
    });
    expect(tx.operator.create).toHaveBeenCalled();
    expect(tx.operatorUser.create).toHaveBeenCalled();
  });

  it("operator name falls back to email when user has no name", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue({
      id: "pg-1",
      email: "noname@example.com",
      grantRole: null,
      operatorParkSlug: "test-park",
      appliedAt: null,
    });
    tx.park.findUnique.mockResolvedValue({
      id: "park-1",
      slug: "test-park",
      operatorId: null,
      operator: null,
    });
    tx.user.findUnique.mockResolvedValue({
      email: "noname@example.com",
      name: null,
    });
    tx.operator.create.mockResolvedValue({ id: "operator-3" });
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));

    await applyPreGrant({ email: "noname@example.com", userId: "user-5" });

    expect(tx.operator.create).toHaveBeenCalledWith({
      data: { name: "noname@example.com", email: "noname@example.com" },
    });
  });
});

describe("applyPreGrantForNewUser", () => {
  it("swallows errors so sign-in is never blocked", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("db down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw.
    await expect(
      applyPreGrantForNewUser({ email: "x@y.com", userId: "user-1" }),
    ).resolves.toBeUndefined();

    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("returns silently on no-grant", async () => {
    const tx = buildTx();
    tx.userPreGrant.findUnique.mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(tx));
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await applyPreGrantForNewUser({
      email: "nobody@example.com",
      userId: "user-1",
    });

    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
