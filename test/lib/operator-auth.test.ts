import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const mockParkWithOperator = {
  id: "park-1",
  name: "Desert Riders Park",
  slug: "desert-riders-park",
  operatorId: "op-1",
  operator: {
    id: "op-1",
    name: "Desert Riders LLC",
    users: [{ role: "OWNER" }],
  },
};

describe("getOperatorContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when user is not authenticated", async () => {
    (auth as any).mockResolvedValue(null);

    const result = await getOperatorContext("desert-riders-park");

    expect(result).toBeNull();
    expect(prisma.park.findUnique).not.toHaveBeenCalled();
  });

  it("should return null when park is not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const result = await getOperatorContext("nonexistent-park");

    expect(result).toBeNull();
  });

  it("should return null when park has no operator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockParkWithOperator,
      operatorId: null,
      operator: null,
    });

    const result = await getOperatorContext("desert-riders-park");

    expect(result).toBeNull();
  });

  it("should return null when user is not a member of the operator", async () => {
    (auth as any).mockResolvedValue({ user: { id: "other-user" } });
    (prisma.park.findUnique as any).mockResolvedValue({
      ...mockParkWithOperator,
      operator: {
        ...mockParkWithOperator.operator,
        users: [], // empty — this user is not a member
      },
    });

    const result = await getOperatorContext("desert-riders-park");

    expect(result).toBeNull();
  });

  it("should return context when user is an operator member", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockParkWithOperator);

    const result = await getOperatorContext("desert-riders-park");

    expect(result).toEqual({
      userId: "user-1",
      operatorId: "op-1",
      operatorName: "Desert Riders LLC",
      parkId: "park-1",
      parkName: "Desert Riders Park",
      parkSlug: "desert-riders-park",
      role: "OWNER",
    });
  });

  it("should query park with correct slug", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(null);

    await getOperatorContext("my-special-park");

    expect(prisma.park.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: "my-special-park", status: "APPROVED" },
      })
    );
  });
});
