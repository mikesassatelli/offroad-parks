import { GET, POST } from "@/app/api/parks/[slug]/conditions/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    trailCondition: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockPark = { id: "park-db-id", slug: "test-park", name: "Test Park" };
const mockUser = { id: "user-1", name: "Rider", image: null };

describe("GET /api/parks/[slug]/conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when park not found", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/parks/nonexistent/conditions");
    const res = await GET(req, { params: Promise.resolve({ slug: "nonexistent" }) });
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Park not found");
  });

  it("should return published fresh conditions", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    const mockConditions = [
      {
        id: "cond-1",
        parkId: "park-db-id",
        userId: "user-1",
        status: "OPEN",
        note: null,
        reportStatus: "PUBLISHED",
        createdAt: new Date(),
        user: mockUser,
      },
    ];
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue(
      mockConditions as any,
    );

    const req = new Request("http://localhost/api/parks/test-park/conditions");
    const res = await GET(req, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.conditions).toHaveLength(1);
    expect(data.conditions[0].status).toBe("OPEN");
  });

  it("should pass stale threshold to Prisma query", async () => {
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findMany).mockResolvedValue([]);

    const req = new Request("http://localhost/api/parks/test-park/conditions");
    await GET(req, { params: Promise.resolve({ slug: "test-park" }) });

    const callArgs = vi.mocked(prisma.trailCondition.findMany).mock.calls[0]?.[0];
    expect(callArgs?.where?.reportStatus).toBe("PUBLISHED");
    expect(callArgs?.where?.createdAt).toBeDefined();
    expect(callArgs?.where?.parkId).toBe("park-db-id");
  });
});

describe("POST /api/parks/[slug]/conditions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    expect(res.status).toBe(401);
  });

  it("should return 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const req = new Request("http://localhost/api/parks/bad/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "bad" }) });
    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "GREAT" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    expect(res.status).toBe(400);
  });

  it("should create PUBLISHED condition when no note provided", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    const created = {
      id: "cond-1",
      parkId: "park-db-id",
      userId: "user-1",
      status: "OPEN",
      note: null,
      reportStatus: "PUBLISHED",
      createdAt: new Date(),
      user: mockUser,
    };
    vi.mocked(prisma.trailCondition.create).mockResolvedValue(created as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.condition.reportStatus).toBe("PUBLISHED");

    const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
    expect(createCall.data.reportStatus).toBe("PUBLISHED");
    expect(createCall.data.note).toBeNull();
  });

  it("should create PENDING_REVIEW condition when note is provided", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    const created = {
      id: "cond-2",
      parkId: "park-db-id",
      userId: "user-1",
      status: "MUDDY",
      note: "Lower trails are slick",
      reportStatus: "PENDING_REVIEW",
      createdAt: new Date(),
      user: mockUser,
    };
    vi.mocked(prisma.trailCondition.create).mockResolvedValue(created as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "MUDDY", note: "Lower trails are slick" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.condition.reportStatus).toBe("PENDING_REVIEW");
    expect(data.message).toContain("admin approval");

    const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
    expect(createCall.data.reportStatus).toBe("PENDING_REVIEW");
    expect(createCall.data.note).toBe("Lower trails are slick");
  });

  it("should treat whitespace-only note as no note (publish immediately)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.create).mockResolvedValue({
      id: "cond-3",
      reportStatus: "PUBLISHED",
      note: null,
      status: "OPEN",
      user: mockUser,
    } as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN", note: "   " }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });

    const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
    expect(createCall.data.reportStatus).toBe("PUBLISHED");
    expect(createCall.data.note).toBeNull();
    expect(res.status).toBe(201);
  });
});
