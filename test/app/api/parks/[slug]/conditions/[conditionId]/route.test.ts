import { DELETE } from "@/app/api/parks/[slug]/conditions/[conditionId]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    trailCondition: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockSession = { user: { id: "user-1" } };
const mockPark = { id: "park-1" };
const mockCondition = { id: "cond-1", parkId: "park-1", userId: "user-1" };

function makeRequest() {
  return new Request("http://localhost/api/parks/test-park/conditions/cond-1", {
    method: "DELETE",
  });
}

const defaultParams = { params: Promise.resolve({ slug: "test-park", conditionId: "cond-1" }) };

describe("DELETE /api/parks/[slug]/conditions/[conditionId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(401);
  });

  it("returns 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/park not found/i);
  });

  it("returns 404 when condition not found", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue(null);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toMatch(/condition not found/i);
  });

  it("returns 404 when condition belongs to a different park", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      ...mockCondition,
      parkId: "different-park",
    } as any);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(404);
  });

  it("returns 403 when condition belongs to a different user", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      ...mockCondition,
      userId: "another-user",
    } as any);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toMatch(/forbidden/i);
  });

  it("deletes the condition and returns success when owner requests", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue(mockCondition as any);
    vi.mocked(prisma.trailCondition.delete).mockResolvedValue(mockCondition as any);

    const res = await DELETE(makeRequest(), defaultParams);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(prisma.trailCondition.delete).toHaveBeenCalledWith({
      where: { id: "cond-1" },
    });
  });

  it("does not call delete when ownership check fails", async () => {
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findUnique).mockResolvedValue({
      ...mockCondition,
      userId: "another-user",
    } as any);

    await DELETE(makeRequest(), defaultParams);
    expect(prisma.trailCondition.delete).not.toHaveBeenCalled();
  });
});
