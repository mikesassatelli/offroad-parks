import { GET } from "@/app/api/admin/corrections/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkCorrectionReport: {
      findMany: vi.fn(),
    },
  },
}));

function makeReq(status?: string) {
  const url = status
    ? `http://localhost/api/admin/corrections?status=${status}`
    : "http://localhost/api/admin/corrections";
  return new Request(url);
}

describe("GET /api/admin/corrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin user", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "u", role: "USER" } } as any);
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
  });

  it("allows read-only beta testers (view access)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "b", role: "BETA_TESTER" },
    } as any);
    vi.mocked(prisma.parkCorrectionReport.findMany).mockResolvedValue([] as any);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
  });

  it("defaults to PENDING and returns reports", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findMany).mockResolvedValue([
      { id: "r1", status: "PENDING", note: "x" },
    ] as any);
    const res = await GET(makeReq());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.reports).toHaveLength(1);
    const call = vi.mocked(prisma.parkCorrectionReport.findMany).mock.calls[0][0];
    expect(call?.where?.status).toBe("PENDING");
  });

  it("honors a valid status filter", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findMany).mockResolvedValue([] as any);
    await GET(makeReq("RESOLVED"));
    const call = vi.mocked(prisma.parkCorrectionReport.findMany).mock.calls[0][0];
    expect(call?.where?.status).toBe("RESOLVED");
  });

  it("falls back to PENDING for an invalid status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findMany).mockResolvedValue([] as any);
    await GET(makeReq("BOGUS"));
    const call = vi.mocked(prisma.parkCorrectionReport.findMany).mock.calls[0][0];
    expect(call?.where?.status).toBe("PENDING");
  });
});
