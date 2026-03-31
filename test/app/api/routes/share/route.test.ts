import { GET } from "@/app/api/routes/share/[shareToken]/route";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    route: {
      findUnique: vi.fn(),
    },
  },
}));

const mockRoute = {
  id: "route-1",
  userId: "user-123",
  title: "Public Route",
  description: null,
  shareToken: "share-abc",
  isPublic: true,
  waypoints: [{ id: "w1" }, { id: "w2" }],
  routeGeometry: null,
  totalDistanceMi: 45.5,
  estimatedDurationMin: 60,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const makeContext = (shareToken: string) => ({
  params: Promise.resolve({ shareToken }),
});

describe("GET /api/routes/share/[shareToken]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when route not found", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost/api/routes/share/bad-token");
    const response = await GET(request, makeContext("bad-token"));

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data).toEqual({ error: "Not found" });
  });

  it("should return 404 when route is private", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValue({
      ...mockRoute,
      isPublic: false,
    } as any);

    const request = new Request("http://localhost/api/routes/share/share-abc");
    const response = await GET(request, makeContext("share-abc"));

    expect(response.status).toBe(404);
  });

  it("should return 200 with route when public", async () => {
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);

    const request = new Request("http://localhost/api/routes/share/share-abc");
    const response = await GET(request, makeContext("share-abc"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Public Route");
    expect(data.shareToken).toBe("share-abc");
    expect(prisma.route.findUnique).toHaveBeenCalledWith({
      where: { shareToken: "share-abc" },
    });
  });
});
