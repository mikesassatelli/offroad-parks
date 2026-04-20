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
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    operatorUser: {
      findUnique: vi.fn(),
    },
  },
}));

const mockPark = {
  id: "park-db-id",
  slug: "test-park",
  name: "Test Park",
  operatorId: null as string | null,
};
const mockParkWithOperator = {
  id: "park-db-id",
  slug: "test-park",
  name: "Test Park",
  operatorId: "op-1",
};
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
    expect(callArgs?.where?.parkId).toBe("park-db-id");
    // Staleness is now expressed as an OR: fresh by age OR active pin
    expect(callArgs?.where?.OR).toBeDefined();
    expect(callArgs?.where?.OR).toHaveLength(2);
    expect((callArgs?.where?.OR as any[])[0]?.createdAt).toBeDefined();
    expect((callArgs?.where?.OR as any[])[1]?.pinnedUntil).toBeDefined();
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

  it("should return 400 when request body is not valid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    // Build a Request whose body isn't valid JSON. Next.js' Request.json()
    // will throw, and the route should convert that into a 400.
    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json{{{",
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid JSON");
    // Must short-circuit before attempting to write a condition.
    expect(prisma.trailCondition.create).not.toHaveBeenCalled();
  });

  it("should return 400 when status field is missing", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: "no status here" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/status must be one of/i);
    expect(prisma.trailCondition.create).not.toHaveBeenCalled();
  });

  it("operator auto-publish is skipped when park has no operator (operatorId is null)", async () => {
    // Regression guard for the `park.operatorId ? ... : false` short-circuit:
    // a logged-in user submitting to an unowned park must not trigger an
    // operatorUser lookup.
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.trailCondition.create).mockResolvedValue({
      id: "cond-noop",
      reportStatus: "PUBLISHED",
      note: null,
      status: "OPEN",
      user: mockUser,
    } as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });

    expect(res.status).toBe(201);
    expect(prisma.operatorUser.findUnique).not.toHaveBeenCalled();

    const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
    expect(createCall.data.isOperatorPost).toBe(false);
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

  it("should return 409 when user already has an active condition", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue({ id: "existing" } as any);

    const req = new Request("http://localhost/api/parks/test-park/conditions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "OPEN" }),
    });
    const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toMatch(/already have an active/i);
  });

  it("should create PUBLISHED condition when no note provided", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
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
    vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
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

  describe("auto-approval for privileged submitters", () => {
    it("auto-publishes a note submitted by an ADMIN user", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "admin-1", role: "ADMIN" },
      } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.trailCondition.create).mockResolvedValue({
        id: "cond-admin",
        reportStatus: "PUBLISHED",
        note: "Trail is blocked by a downed tree",
        status: "CAUTION",
        user: mockUser,
      } as any);

      const req = new Request("http://localhost/api/parks/test-park/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CAUTION",
          note: "Trail is blocked by a downed tree",
        }),
      });
      const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.condition.reportStatus).toBe("PUBLISHED");

      // Admins skip the operator lookup entirely.
      expect(prisma.operatorUser.findUnique).not.toHaveBeenCalled();

      const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
      expect(createCall.data.reportStatus).toBe("PUBLISHED");
      expect(createCall.data.isOperatorPost).toBe(false);
      expect(createCall.data.note).toBe("Trail is blocked by a downed tree");
    });

    it("auto-publishes a note submitted by an operator of the target park", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "op-user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(
        mockParkWithOperator as any,
      );
      vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.operatorUser.findUnique).mockResolvedValue({
        id: "op-user-link",
      } as any);
      vi.mocked(prisma.trailCondition.create).mockResolvedValue({
        id: "cond-op",
        reportStatus: "PUBLISHED",
        note: "Gate closed for weather",
        status: "CLOSED",
        isOperatorPost: true,
        user: mockUser,
      } as any);

      const req = new Request("http://localhost/api/parks/test-park/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
          note: "Gate closed for weather",
        }),
      });
      const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.condition.reportStatus).toBe("PUBLISHED");

      // Operator lookup is scoped to this park's operator.
      expect(prisma.operatorUser.findUnique).toHaveBeenCalledWith({
        where: {
          operatorId_userId: { operatorId: "op-1", userId: "op-user-1" },
        },
        select: { id: true },
      });

      const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
      expect(createCall.data.reportStatus).toBe("PUBLISHED");
      expect(createCall.data.isOperatorPost).toBe(true);
    });

    it("does NOT auto-publish when an operator submits for a different park", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "other-op-user" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(
        mockParkWithOperator as any,
      );
      vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
      // Operator-for-a-different-park → no matching OperatorUser row.
      vi.mocked(prisma.operatorUser.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.trailCondition.create).mockResolvedValue({
        id: "cond-reg-note",
        reportStatus: "PENDING_REVIEW",
        note: "Muddy up top",
        status: "MUDDY",
        user: mockUser,
      } as any);

      const req = new Request("http://localhost/api/parks/test-park/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "MUDDY", note: "Muddy up top" }),
      });
      const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.condition.reportStatus).toBe("PENDING_REVIEW");

      const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
      expect(createCall.data.reportStatus).toBe("PENDING_REVIEW");
      expect(createCall.data.isOperatorPost).toBe(false);
    });

    it("preserves existing behavior for regular users (note → PENDING_REVIEW)", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", role: "USER" },
      } as any);
      // Park with no operator at all — no operator lookup needed.
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.trailCondition.create).mockResolvedValue({
        id: "cond-reg",
        reportStatus: "PENDING_REVIEW",
        note: "Bridge washed out",
        status: "CLOSED",
        user: mockUser,
      } as any);

      const req = new Request("http://localhost/api/parks/test-park/conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED", note: "Bridge washed out" }),
      });
      const res = await POST(req, { params: Promise.resolve({ slug: "test-park" }) });
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.condition.reportStatus).toBe("PENDING_REVIEW");
      expect(data.message).toContain("admin approval");

      // When park has no operator, we skip the operatorUser lookup.
      expect(prisma.operatorUser.findUnique).not.toHaveBeenCalled();

      const createCall = vi.mocked(prisma.trailCondition.create).mock.calls[0][0];
      expect(createCall.data.reportStatus).toBe("PENDING_REVIEW");
      expect(createCall.data.isOperatorPost).toBe(false);
    });
  });

  it("should treat whitespace-only note as no note (publish immediately)", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.trailCondition.findFirst).mockResolvedValue(null);
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
