import { POST } from "@/app/api/admin/claims/[id]/approve/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkClaim: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    operator: {
      create: vi.fn(),
    },
    operatorUser: {
      create: vi.fn(),
    },
    park: {
      update: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const adminSession = { user: { id: "admin-1", role: "ADMIN" } };

const mockClaim = {
  id: "claim-1",
  status: "PENDING",
  parkId: "park-1",
  userId: "user-1",
  claimantName: "Jane Smith",
  claimantEmail: "jane@example.com",
  claimantPhone: null,
  businessName: "Desert Riders LLC",
  message: null,
  park: { id: "park-1", name: "Test Park", operatorId: null },
  user: { id: "user-1", email: "jane@example.com" },
};

describe("POST /api/admin/claims/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1", role: "USER" } });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 404 when claim not found", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });

    expect(response.status).toBe(404);
  });

  it("should return 400 when claim is already reviewed", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue({
      ...mockClaim,
      status: "APPROVED",
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Claim has already been reviewed");
  });

  it("should return 409 when park already has an operator", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue({
      ...mockClaim,
      park: { id: "park-1", name: "Test Park", operatorId: "existing-operator" },
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(409);
  });

  it("should approve claim via transaction and return 200", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(mockClaim);
    (prisma.$transaction as any).mockImplementation(async (fn: any) => {
      return fn({
        operator: { create: vi.fn().mockResolvedValue({ id: "op-1", name: "Desert Riders LLC" }) },
        operatorUser: { create: vi.fn().mockResolvedValue({}) },
        park: { update: vi.fn().mockResolvedValue({}) },
        parkClaim: {
          update: vi.fn().mockResolvedValue({ id: "claim-1", status: "APPROVED" }),
        },
        user: { update: vi.fn().mockResolvedValue({}) },
      });
    });

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
