import { GET } from "@/app/api/admin/claims/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkClaim: {
      count: vi.fn(),
      findMany: vi.fn(),
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
  claimantName: "Jane Smith",
  claimantEmail: "jane@example.com",
  claimantPhone: null,
  businessName: null,
  message: null,
  reviewedAt: null,
  reviewNotes: null,
  createdAt: new Date(),
  park: { id: "park-1", name: "Test Park", slug: "test-park", address: { city: "Tucson", state: "AZ" } },
  user: { id: "user-1", name: "Jane Smith", email: "jane@example.com", image: null },
};

describe("GET /api/admin/claims", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 403 when not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/admin/claims");
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it("should return 403 when not admin", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1", role: "USER" } });

    const request = new Request("http://localhost/api/admin/claims");
    const response = await GET(request);

    expect(response.status).toBe(403);
  });

  it("should return paginated PENDING claims by default", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.count as any).mockResolvedValue(1);
    (prisma.parkClaim.findMany as any).mockResolvedValue([mockClaim]);

    const request = new Request("http://localhost/api/admin/claims");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claims).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
    expect(prisma.parkClaim.count).toHaveBeenCalledWith({ where: { status: "PENDING" } });
  });

  it("should filter by status query param", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.count as any).mockResolvedValue(0);
    (prisma.parkClaim.findMany as any).mockResolvedValue([]);

    const request = new Request("http://localhost/api/admin/claims?status=APPROVED");
    await GET(request);

    expect(prisma.parkClaim.count).toHaveBeenCalledWith({ where: { status: "APPROVED" } });
  });

  it("should return pagination metadata", async () => {
    (auth as any).mockResolvedValue(adminSession);
    (prisma.parkClaim.count as any).mockResolvedValue(45);
    (prisma.parkClaim.findMany as any).mockResolvedValue([mockClaim]);

    const request = new Request("http://localhost/api/admin/claims?page=2&limit=20");
    const response = await GET(request);

    const data = await response.json();
    expect(data.pagination).toMatchObject({
      page: 2,
      limit: 20,
      total: 45,
      totalPages: 3,
    });
  });
});
