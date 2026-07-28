import { POST } from "@/app/api/admin/ai-research/extractions/[id]/approve/route";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/api-helpers", () => ({
  requireAdmin: vi.fn(),
}));

// Transaction client shared by the mock so tests can assert on its calls.
const tx = {
  park: {
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  address: { updateMany: vi.fn() },
  fieldExtraction: {
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  parkEditLog: { create: vi.fn() },
  parkTerrain: { findMany: vi.fn(), create: vi.fn() },
  parkAmenity: { findMany: vi.fn(), create: vi.fn() },
  parkCamping: { findMany: vi.fn(), create: vi.fn() },
  parkVehicleType: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fieldExtraction: { findUnique: vi.fn() },
    $transaction: vi.fn(async (cb: (client: typeof tx) => unknown) => cb(tx)),
  },
}));

vi.mock("@/lib/ai/research-lifecycle", () => ({
  calculateCompleteness: vi.fn(() => 42),
  getCurrentFieldValue: vi.fn(() => null),
}));

const emptyParkRelations = {
  terrain: [],
  amenities: [],
  camping: [],
  vehicleTypes: [],
  address: null,
};

function makeReq(body?: unknown) {
  return new Request(
    "http://localhost/api/admin/ai-research/extractions/ext-1/approve",
    {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
}

const params = { params: Promise.resolve({ id: "ext-1" }) };

describe("POST /api/admin/ai-research/extractions/[id]/approve — hours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: "admin-1" },
    } as never);
    tx.park.findUnique.mockResolvedValue({
      id: "park-1",
      ...emptyParkRelations,
    });
  });

  it("applies a structured hours object to Park.hours unchanged", async () => {
    const hours = {
      mon: { open: "08:00", close: "18:00" },
      tue: { open: "08:00", close: "18:00" },
      wed: null,
      thu: null,
      fri: null,
      sat: { closed: true },
      sun: null,
    };

    vi.mocked(prisma.fieldExtraction.findUnique).mockResolvedValue({
      id: "ext-1",
      parkId: "park-1",
      fieldName: "hours",
      extractedValue: JSON.stringify(hours),
      status: "PENDING_REVIEW",
      dataSourceId: null,
      park: { id: "park-1", ...emptyParkRelations },
    } as never);

    const res = await POST(makeReq(), params);
    expect(res.status).toBe(200);

    // Scalar path: the parsed object is written straight to Park.hours.
    expect(tx.park.update).toHaveBeenCalledWith({
      where: { id: "park-1" },
      data: { hours },
    });

    // Extraction is marked approved.
    expect(tx.fieldExtraction.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ext-1" },
        data: expect.objectContaining({ status: "APPROVED" }),
      }),
    );
  });
});
