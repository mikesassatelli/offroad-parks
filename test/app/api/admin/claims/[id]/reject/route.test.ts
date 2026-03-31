import { POST } from "@/app/api/admin/claims/[id]/reject/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkClaim: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
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
};

function makeRequest(body?: unknown) {
  return new Request("http://localhost", {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("POST /api/admin/claims/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1", role: "USER" } });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(403);
  });

  it("should return 404 when claim not found", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(null);

    const response = await POST(makeRequest(), {
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

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Claim has already been reviewed");
  });

  it("should reject claim and return 200", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(mockClaim);
    (prisma.parkClaim.update as any).mockResolvedValue({
      id: "claim-1",
      status: "REJECTED",
    });

    const response = await POST(makeRequest({ reviewNotes: "Not the owner" }), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(prisma.parkClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "REJECTED",
          reviewNotes: "Not the owner",
        }),
      })
    );
  });

  it("should reject claim with no notes when body is empty", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.findUnique as any).mockResolvedValue(mockClaim);
    (prisma.parkClaim.update as any).mockResolvedValue({
      id: "claim-1",
      status: "REJECTED",
    });

    // Send empty body (no JSON)
    const response = await POST(new Request("http://localhost", { method: "POST" }), {
      params: Promise.resolve({ id: "claim-1" }),
    });

    expect(response.status).toBe(200);
    expect(prisma.parkClaim.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewNotes: null }),
      })
    );
  });
});
