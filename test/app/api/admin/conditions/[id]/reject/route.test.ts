import { POST } from "@/app/api/admin/conditions/[id]/reject/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    trailCondition: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockPendingCondition = {
  id: "cond-1",
  parkId: "park-1",
  userId: "user-1",
  status: "MUDDY",
  note: "Slick trails",
  reportStatus: "PENDING_REVIEW",
  createdAt: new Date(),
};

describe("POST /api/admin/conditions/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = new Request("http://localhost/api/admin/conditions/cond-1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "cond-1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 403 when user is not admin", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1", role: "USER" } } as any);

    const req = new Request("http://localhost/api/admin/conditions/cond-1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "cond-1" }) });
    expect(res.status).toBe(403);
  });

  it("should return 404 when condition not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/conditions/cond-1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "cond-1" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 when condition is already published", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      ...mockPendingCondition,
      reportStatus: "PUBLISHED",
    } as any);

    const req = new Request("http://localhost/api/admin/conditions/cond-1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "cond-1" }) });
    expect(res.status).toBe(400);
  });

  it("should delete the condition when admin rejects", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } } as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue(mockPendingCondition as any);
    vi.mocked(prisma.trailCondition.delete).mockResolvedValue(mockPendingCondition as any);

    const req = new Request("http://localhost/api/admin/conditions/cond-1/reject", { method: "POST" });
    const res = await POST(req, { params: Promise.resolve({ id: "cond-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.trailCondition.delete).toHaveBeenCalledWith({ where: { id: "cond-1" } });
  });
});
