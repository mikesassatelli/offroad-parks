import { DELETE, GET, PATCH } from "@/app/api/routes/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    route: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
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
  waypoints: [{ id: "w1" }, { id: "w2" }],
  routeGeometry: null,
  totalDistanceMi: null,
  estimatedDurationMin: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const makeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const makeRequest = (method = "GET", body?: unknown) =>
  new Request(`http://localhost/api/routes/route-1`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });

describe("GET /api/routes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when route not found", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(null);

    const response = await GET(makeRequest(), makeContext("route-1"));
    expect(response.status).toBe(404);
  });

  it("should return 403 for private route when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);

    const response = await GET(makeRequest(), makeContext("route-1"));
    expect(response.status).toBe(403);
  });

  it("should return 200 for owner of private route", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);

    const response = await GET(makeRequest(), makeContext("route-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("route-1");
  });

  it("should return 200 for public route without auth", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue({
      ...mockRoute,
      isPublic: true,
    } as any);

    const response = await GET(makeRequest(), makeContext("route-1"));
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/routes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await PATCH(
      makeRequest("PATCH", { title: "New Title" }),
      makeContext("route-1"),
    );
    expect(response.status).toBe(401);
  });

  it("should return 403 when authenticated as wrong user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);

    const response = await PATCH(
      makeRequest("PATCH", { title: "New Title" }),
      makeContext("route-1"),
    );
    expect(response.status).toBe(403);
  });

  it("should update route and return 200 for owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);
    vi.mocked(prisma.route.update).mockResolvedValue({
      ...mockRoute,
      title: "Updated Title",
    } as any);

    const response = await PATCH(
      makeRequest("PATCH", { title: "Updated Title" }),
      makeContext("route-1"),
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.title).toBe("Updated Title");
    expect(prisma.route.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "route-1" },
        data: expect.objectContaining({ title: "Updated Title" }),
      }),
    );
  });

  it("should override waypoints/geometry when provided (reopen-override flow)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);
    vi.mocked(prisma.route.update).mockResolvedValue(mockRoute as any);

    const newWaypoints = [
      { id: "w1", type: "park", label: "A", lat: 1, lng: 2 },
      { id: "w2", type: "park", label: "B", lat: 3, lng: 4 },
      { id: "w3", type: "custom", label: "C", lat: 5, lng: 6 },
    ];

    const response = await PATCH(
      makeRequest("PATCH", {
        waypoints: newWaypoints,
        totalDistanceMi: 250,
        estimatedDurationMin: 300,
      }),
      makeContext("route-1"),
    );

    expect(response.status).toBe(200);
    expect(prisma.route.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "route-1" },
        data: expect.objectContaining({
          waypoints: newWaypoints,
          totalDistanceMi: 250,
          estimatedDurationMin: 300,
        }),
      }),
    );
  });
});

describe("DELETE /api/routes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when unauthenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const response = await DELETE(makeRequest("DELETE"), makeContext("route-1"));
    expect(response.status).toBe(401);
  });

  it("should return 403 when authenticated as wrong user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "other-user" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);

    const response = await DELETE(makeRequest("DELETE"), makeContext("route-1"));
    expect(response.status).toBe(403);
  });

  it("should delete route and return 200 for owner", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
    vi.mocked(prisma.route.findUnique).mockResolvedValue(mockRoute as any);
    vi.mocked(prisma.route.delete).mockResolvedValue(mockRoute as any);

    const response = await DELETE(makeRequest("DELETE"), makeContext("route-1"));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(prisma.route.delete).toHaveBeenCalledWith({
      where: { id: "route-1" },
    });
  });
});
