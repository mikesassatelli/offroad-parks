import { PATCH } from "@/app/api/admin/corrections/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkCorrectionReport: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

function makeReq(body: unknown) {
  return new Request("http://localhost/api/admin/corrections/rep-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "rep-1" }) };

describe("PATCH /api/admin/corrections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await PATCH(makeReq({ status: "RESOLVED" }), params);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin (incl. beta tester — mutating action)", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "b", role: "BETA_TESTER" },
    } as any);
    const res = await PATCH(makeReq({ status: "RESOLVED" }), params);
    expect(res.status).toBe(403);
  });

  it("returns 400 for an invalid status", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    const res = await PATCH(makeReq({ status: "PENDING" }), params);
    expect(res.status).toBe(400);
    expect(prisma.parkCorrectionReport.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the report does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findUnique).mockResolvedValue(null);
    const res = await PATCH(makeReq({ status: "RESOLVED" }), params);
    expect(res.status).toBe(404);
  });

  it("resolves a report", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findUnique).mockResolvedValue({
      id: "rep-1",
      status: "PENDING",
    } as any);
    vi.mocked(prisma.parkCorrectionReport.update).mockResolvedValue({
      id: "rep-1",
      status: "RESOLVED",
    } as any);

    const res = await PATCH(makeReq({ status: "RESOLVED" }), params);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.parkCorrectionReport.update).toHaveBeenCalledWith({
      where: { id: "rep-1" },
      data: { status: "RESOLVED" },
    });
  });

  it("dismisses a report", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "a", role: "SUPER_ADMIN" } } as any);
    vi.mocked(prisma.parkCorrectionReport.findUnique).mockResolvedValue({
      id: "rep-1",
      status: "PENDING",
    } as any);
    vi.mocked(prisma.parkCorrectionReport.update).mockResolvedValue({
      id: "rep-1",
      status: "DISMISSED",
    } as any);

    const res = await PATCH(makeReq({ status: "DISMISSED" }), params);
    expect(res.status).toBe(200);
    const call = vi.mocked(prisma.parkCorrectionReport.update).mock.calls[0][0];
    expect(call.data.status).toBe("DISMISSED");
  });
});
