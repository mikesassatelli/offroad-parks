import { GET, POST } from "@/app/api/routes/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    route: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockRoute = {
  id: "route-1",
  userId: "user-123",
  title: "My Route",
  description: null,
  shareToken: "share-abc",
  isPublic: false,
  waypoints: [],
  routeGeometry: null,
  totalDistanceMi: null,
  estimatedDurationMin: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("GET /api/routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return user routes when authenticated", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.findMany).mockResolvedValue([mockRoute] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].title).toBe("My Route");
    expect(prisma.route.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      orderBy: { updatedAt: "desc" },
    });
  });
});

describe("POST /api/routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request("http://localhost/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", waypoints: [{}, {}] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 400 when title is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);

    const request = new Request("http://localhost/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waypoints: [{ id: "1" }, { id: "2" }] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/title/i);
  });

  it("should return 400 when fewer than 2 waypoints provided", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);

    const request = new Request("http://localhost/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", waypoints: [{ id: "1" }] }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/waypoint/i);
  });

  it("should create and return route with status 201", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.create).mockResolvedValue({
      ...mockRoute,
      title: "Road Trip",
      waypoints: [{ id: "w1" }, { id: "w2" }],
    } as any);

    const request = new Request("http://localhost/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Road Trip",
        waypoints: [
          { id: "w1", type: "park", label: "Park A", lat: 34, lng: -118 },
          { id: "w2", type: "park", label: "Park B", lat: 37, lng: -122 },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.title).toBe("Road Trip");
    expect(prisma.route.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-123",
          title: "Road Trip",
        }),
      }),
    );
  });
});
