import { POST } from "@/app/api/parks/[slug]/corrections/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { __resetRateLimitStore } from "@/lib/rate-limit";
import { vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    fieldExtraction: {
      create: vi.fn(),
    },
    parkCorrectionReport: {
      create: vi.fn(),
    },
  },
}));

const mockPark = { id: "park-db-id", slug: "test-park", name: "Test Park" };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/parks/test-park/corrections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ slug: "test-park" }) };

describe("POST /api/parks/[slug]/corrections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetRateLimitStore();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    const res = await POST(makeReq({ kind: "text", note: "hi" }), params);
    expect(res.status).toBe(401);
    expect(prisma.parkCorrectionReport.create).not.toHaveBeenCalled();
  });

  it("returns 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    const res = await POST(makeReq({ kind: "text", note: "hi" }), params);
    expect(res.status).toBe(404);
  });

  it("returns 400 on invalid JSON", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    const res = await POST(makeReq("not-json{{{"), params);
    expect(res.status).toBe(400);
  });

  describe("kind: text", () => {
    it("creates a ParkCorrectionReport", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.parkCorrectionReport.create).mockResolvedValue({
        id: "rep-1",
      } as any);

      const res = await POST(
        makeReq({ kind: "text", note: "The gate hours are wrong." }),
        params,
      );
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      const call = vi.mocked(prisma.parkCorrectionReport.create).mock.calls[0][0];
      expect(call.data).toMatchObject({
        parkId: "park-db-id",
        userId: "user-1",
        note: "The gate hours are wrong.",
      });
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects an empty text note", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(makeReq({ kind: "text", note: "   " }), params);
      expect(res.status).toBe(400);
      expect(prisma.parkCorrectionReport.create).not.toHaveBeenCalled();
    });
  });

  describe("kind: field", () => {
    it("inserts a USER_SUBMITTED FieldExtraction for a valid string field", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.fieldExtraction.create).mockResolvedValue({
        id: "fx-1",
      } as any);

      const res = await POST(
        makeReq({
          kind: "field",
          fieldName: "website",
          value: "https://example.com",
          note: "from their homepage",
        }),
        params,
      );
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.kind).toBe("field");
      const call = vi.mocked(prisma.fieldExtraction.create).mock.calls[0][0];
      expect(call.data).toMatchObject({
        parkId: "park-db-id",
        fieldName: "website",
        extractedValue: JSON.stringify("https://example.com"),
        sourceQuote: "from their homepage",
        confidence: "USER_SUBMITTED",
        status: "PENDING_REVIEW",
        dataSourceId: null,
        sessionId: null,
      });
    });

    it("coerces and stringifies a number field", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.fieldExtraction.create).mockResolvedValue({ id: "fx" } as any);

      const res = await POST(
        makeReq({ kind: "field", fieldName: "dayPassUSD", value: 25 }),
        params,
      );
      expect(res.status).toBe(201);
      const call = vi.mocked(prisma.fieldExtraction.create).mock.calls[0][0];
      expect(call.data.extractedValue).toBe(JSON.stringify(25));
      expect(call.data.sourceQuote).toBeNull();
    });

    it("accepts a boolean field", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.fieldExtraction.create).mockResolvedValue({ id: "fx" } as any);

      const res = await POST(
        makeReq({ kind: "field", fieldName: "isFree", value: true }),
        params,
      );
      expect(res.status).toBe(201);
      const call = vi.mocked(prisma.fieldExtraction.create).mock.calls[0][0];
      expect(call.data.extractedValue).toBe(JSON.stringify(true));
    });

    it("accepts a valid Ownership enum value", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.fieldExtraction.create).mockResolvedValue({ id: "fx" } as any);

      const res = await POST(
        makeReq({ kind: "field", fieldName: "ownership", value: "public" }),
        params,
      );
      expect(res.status).toBe(201);
    });

    it("rejects an invalid Ownership enum value", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({ kind: "field", fieldName: "ownership", value: "government" }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects a field outside the correctable subset (latitude)", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({ kind: "field", fieldName: "latitude", value: 34.1 }),
        params,
      );
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.error).toMatch(/not a correctable field/i);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects an entirely unknown field", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({ kind: "field", fieldName: "bogusField", value: "x" }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects a wrong value type (number expected, string given)", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({ kind: "field", fieldName: "acres", value: "lots" }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("accepts and stringifies a valid weekly-hours object", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      vi.mocked(prisma.fieldExtraction.create).mockResolvedValue({ id: "fx" } as any);

      const hours = {
        mon: { open: "08:00", close: "18:00" },
        tue: { open: "08:00", close: "18:00" },
        wed: null,
        thu: null,
        fri: null,
        sat: { closed: true },
        sun: null,
      };
      const res = await POST(
        makeReq({ kind: "field", fieldName: "hours", value: hours }),
        params,
      );
      expect(res.status).toBe(201);
      const call = vi.mocked(prisma.fieldExtraction.create).mock.calls[0][0];
      expect(call.data.fieldName).toBe("hours");
      expect(call.data.extractedValue).toBe(JSON.stringify(hours));
      // The stored value round-trips back into a proper object for the approve route.
      expect(JSON.parse(call.data.extractedValue as string)).toEqual(hours);
    });

    it("rejects a malformed weekly-hours object (open >= close)", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({
          kind: "field",
          fieldName: "hours",
          value: {
            mon: { open: "18:00", close: "08:00" },
            tue: null,
            wed: null,
            thu: null,
            fri: null,
            sat: null,
            sun: null,
          },
        }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects a weekly-hours value with a bad time format", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({
          kind: "field",
          fieldName: "hours",
          value: {
            mon: { open: "8am", close: "6pm" },
            tue: null,
            wed: null,
            thu: null,
            fri: null,
            sat: null,
            sun: null,
          },
        }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });

    it("rejects a non-object hours value", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
      const res = await POST(
        makeReq({ kind: "field", fieldName: "hours", value: "9-5" }),
        params,
      );
      expect(res.status).toBe(400);
      expect(prisma.fieldExtraction.create).not.toHaveBeenCalled();
    });
  });

  it("rate-limits after the configured number of submissions", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "rl-user" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.parkCorrectionReport.create).mockResolvedValue({ id: "r" } as any);

    // corrections preset = 10/day. 11th should be limited.
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await POST(makeReq({ kind: "text", note: `note ${i}` }), params);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
