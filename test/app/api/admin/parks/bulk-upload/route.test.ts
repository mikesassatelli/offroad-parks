import { POST } from "@/app/api/admin/parks/bulk-upload/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock auth and Prisma
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    parkTerrain: {
      create: vi.fn(),
    },
    parkAmenity: {
      create: vi.fn(),
    },
    address: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// OP-90: fire-and-forget map hero, stubbed to avoid spurious Mapbox calls.
vi.mock("@/lib/map-hero/generate", () => ({
  generateMapHeroAsync: vi.fn(),
}));

describe("POST /api/admin/parks/bulk-upload", () => {
  const mockAdminSession = {
    user: { id: "user-123", email: "admin@test.com", role: "ADMIN" },
  };

  const mockUserSession = {
    user: { id: "user-456", email: "user@test.com", role: "USER" },
  };

  const validParks = [
    {
      name: "Test Park 1",
      state: "Utah",
      terrain: ["sand", "rocks"],
      amenities: [],
      camping: [],
      vehicleTypes: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication & Authorization", () => {
    it("should return 401 if not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null as any);

      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: validParks }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it("should return 403 if user is not an admin", async () => {
      vi.mocked(auth).mockResolvedValue(mockUserSession as any);

      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: validParks }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
    });
  });

  describe("Request Validation", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    });

    it("should return 400 if parks array is missing", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveLength(1);
    });

    it("should return 400 if parks array is empty", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: [] }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("Park Validation", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    });

    it("should return 400 if park name is missing", async () => {
      const invalidParks = [
        {
          state: "Utah",
          terrain: ["sand"],
          difficulty: ["easy"],
          vehicleTypes: [],
        },
      ];

      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: invalidParks }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "name",
          message: expect.stringContaining("required"),
        })
      );
    });

    it("should return 400 if terrain is missing", async () => {
      const invalidParks = [
        {
          name: "Test Park",
          state: "Utah",
          difficulty: ["easy"],
          vehicleTypes: [],
        },
      ];

      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: invalidParks }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "terrain",
        })
      );
    });
  });

  describe("Successful Upload", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);

      // Create mock transaction client
      const txMock = {
        park: {
          create: vi.fn().mockResolvedValue({
            id: "park-1",
            name: "Test Park 1",
            slug: "test-park-1",
            status: "APPROVED",
            submitterId: "user-123",
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          findUnique: vi.fn().mockResolvedValue(null),
        },
        parkTerrain: {
          create: vi.fn().mockResolvedValue({}),
        },
        parkAmenity: {
          create: vi.fn().mockResolvedValue({}),
        },
        address: {
          create: vi.fn().mockResolvedValue({}),
        },
      };

      vi.mocked(prisma.$transaction).mockImplementation(
        async (callback: any) => {
          return callback(txMock);
        }
      );
    });

    it("should successfully create parks", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({ parks: validParks }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.created).toBe(1);
      expect(data.errors).toHaveLength(0);
    });
  });

  describe("State Validation (OP normalize-state-full-names)", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    });

    it("rejects when state is missing", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({
            parks: [{ name: "P", terrain: ["sand"] }],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "state",
          message: "State is required",
        })
      );
    });

    it("rejects when state is blank whitespace", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({
            parks: [{ name: "P", state: "   ", terrain: ["sand"] }],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "state",
          message: "State is required",
        })
      );
    });

    it("rejects an unrecognizable state value with 400", async () => {
      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({
            parks: [{ name: "P", state: "Narnia", terrain: ["sand"] }],
          }),
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "state",
          message: expect.stringContaining(`Invalid state: "Narnia"`),
        })
      );
    });

    it("normalizes a 2-letter state code when writing the Address", async () => {
      // Track the address.create payload
      const addressCreate = vi.fn().mockResolvedValue({});
      const parkCreate = vi.fn().mockResolvedValue({
        id: "park-1",
        slug: "p",
      });
      const txMock = {
        park: { create: parkCreate, findUnique: vi.fn().mockResolvedValue(null) },
        parkTerrain: { create: vi.fn().mockResolvedValue({}) },
        parkAmenity: { create: vi.fn().mockResolvedValue({}) },
        parkCamping: { create: vi.fn().mockResolvedValue({}) },
        parkVehicleType: { create: vi.fn().mockResolvedValue({}) },
        address: { create: addressCreate },
      };
      vi.mocked(prisma.$transaction).mockImplementation(
        async (cb: any) => cb(txMock)
      );

      const request = new Request(
        "http://localhost/api/admin/parks/bulk-upload",
        {
          method: "POST",
          body: JSON.stringify({
            parks: [{ name: "P", state: "ar", terrain: ["sand"] }],
          }),
        }
      );

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(addressCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ state: "Arkansas" }),
      });
    });
  });

  describe("Other field-level validation branches", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    });

    function postOne(park: Record<string, unknown>) {
      return POST(
        new Request("http://localhost/api/admin/parks/bulk-upload", {
          method: "POST",
          body: JSON.stringify({ parks: [park] }),
        })
      );
    }

    it("rejects name longer than 100 chars", async () => {
      const response = await postOne({
        name: "a".repeat(101),
        state: "CA",
        terrain: ["sand"],
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "name",
          message: expect.stringContaining("100 characters"),
        })
      );
    });

    it("rejects invalid terrain values", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["not-a-terrain"],
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({
          field: "terrain",
          message: expect.stringContaining("Invalid terrain types"),
        })
      );
    });

    it("rejects invalid amenities", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        amenities: ["lazer-tag"],
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "amenities" })
      );
    });

    it("rejects invalid camping types", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        camping: ["hammock"],
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "camping" })
      );
    });

    it("rejects invalid vehicleTypes", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        vehicleTypes: ["spaceship"],
      });
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "vehicleTypes" })
      );
    });

    it("rejects notes longer than 2000 chars", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        notes: "x".repeat(2001),
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "notes" })
      );
    });

    it("rejects an invalid website URL", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        website: "not a url",
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "website" })
      );
    });

    it("rejects phone numbers longer than 15 digits", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        phone: "1234567890123456", // 16 digits
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "phone" })
      );
    });

    it("rejects out-of-range latitude", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        latitude: 95,
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "latitude" })
      );
    });

    it("rejects out-of-range longitude", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        longitude: -200,
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "longitude" })
      );
    });

    it("rejects negative dayPassUSD, milesOfTrails, acres", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        dayPassUSD: -1,
        milesOfTrails: -5,
        acres: -10,
      });
      const data = await response.json();
      const fields = data.errors.map((e: { field: string }) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining(["dayPassUSD", "milesOfTrails", "acres"])
      );
    });

    it("rejects invalid ownership value", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        ownership: "ALIEN",
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "ownership" })
      );
    });

    it("rejects an invalid contactEmail", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        contactEmail: "not-an-email",
      });
      const data = await response.json();
      expect(data.errors).toContainEqual(
        expect.objectContaining({ field: "contactEmail" })
      );
    });

    it("rejects negative maxVehicleWidthInches and noiseLimitDBA", async () => {
      const response = await postOne({
        name: "P",
        state: "CA",
        terrain: ["sand"],
        maxVehicleWidthInches: -1,
        noiseLimitDBA: -1,
      });
      const data = await response.json();
      const fields = data.errors.map((e: { field: string }) => e.field);
      expect(fields).toEqual(
        expect.arrayContaining(["maxVehicleWidthInches", "noiseLimitDBA"])
      );
    });
  });

  describe("Create path branches", () => {
    beforeEach(() => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
    });

    it("creates terrain/amenities/camping/vehicleTypes when provided", async () => {
      const parkCreate = vi
        .fn()
        .mockResolvedValue({ id: "park-1", slug: "p" });
      const terrainCreate = vi.fn().mockResolvedValue({});
      const amenityCreate = vi.fn().mockResolvedValue({});
      const campingCreate = vi.fn().mockResolvedValue({});
      const vehicleCreate = vi.fn().mockResolvedValue({});

      const txMock = {
        park: {
          create: parkCreate,
          findUnique: vi.fn().mockResolvedValue(null),
        },
        parkTerrain: { create: terrainCreate },
        parkAmenity: { create: amenityCreate },
        parkCamping: { create: campingCreate },
        parkVehicleType: { create: vehicleCreate },
        address: { create: vi.fn().mockResolvedValue({}) },
      };

      vi.mocked(prisma.$transaction).mockImplementation(
        async (cb: any) => cb(txMock)
      );

      const response = await POST(
        new Request("http://localhost/api/admin/parks/bulk-upload", {
          method: "POST",
          body: JSON.stringify({
            parks: [
              {
                name: "Full Park",
                state: "CA",
                terrain: ["sand", "rocks"],
                amenities: ["restrooms"],
                camping: ["tent"],
                vehicleTypes: ["sxs"],
                phone: "(555) 123-4567",
                campingPhone: "555-999-1111",
              },
            ],
          }),
        })
      );

      expect(response.status).toBe(200);
      expect(terrainCreate).toHaveBeenCalledTimes(2);
      expect(amenityCreate).toHaveBeenCalledTimes(1);
      expect(campingCreate).toHaveBeenCalledTimes(1);
      expect(vehicleCreate).toHaveBeenCalledTimes(1);

      // Park phone digits sanitized
      const parkArg = parkCreate.mock.calls[0][0];
      expect(parkArg.data.phone).toBe("5551234567");
      expect(parkArg.data.campingPhone).toBe("5559991111");
    });

    it("auto-generates a unique slug when the base slug already exists", async () => {
      const parkCreate = vi
        .fn()
        .mockResolvedValue({ id: "park-1", slug: "test-park-1" });

      // First findUnique returns existing, second returns null
      const findUnique = vi
        .fn()
        .mockResolvedValueOnce({ slug: "test-park" })
        .mockResolvedValueOnce(null);

      // The generateUniqueSlug helper calls prisma.park.findUnique, not the tx.
      vi.mocked(prisma.park.findUnique).mockImplementation(findUnique);

      const txMock = {
        park: { create: parkCreate, findUnique },
        parkTerrain: { create: vi.fn().mockResolvedValue({}) },
        parkAmenity: { create: vi.fn().mockResolvedValue({}) },
        parkCamping: { create: vi.fn().mockResolvedValue({}) },
        parkVehicleType: { create: vi.fn().mockResolvedValue({}) },
        address: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(
        async (cb: any) => cb(txMock)
      );

      const response = await POST(
        new Request("http://localhost/api/admin/parks/bulk-upload", {
          method: "POST",
          body: JSON.stringify({
            parks: [
              {
                name: "Test Park",
                state: "CA",
                terrain: ["sand"],
              },
            ],
          }),
        })
      );

      expect(response.status).toBe(200);
      const parkArg = parkCreate.mock.calls[0][0];
      expect(parkArg.data.slug).toBe("test-park-1");
    });

    it("uses a provided slug verbatim when given", async () => {
      const parkCreate = vi
        .fn()
        .mockResolvedValue({ id: "park-1", slug: "custom-slug" });
      const txMock = {
        park: {
          create: parkCreate,
          findUnique: vi.fn().mockResolvedValue(null),
        },
        parkTerrain: { create: vi.fn().mockResolvedValue({}) },
        parkAmenity: { create: vi.fn().mockResolvedValue({}) },
        parkCamping: { create: vi.fn().mockResolvedValue({}) },
        parkVehicleType: { create: vi.fn().mockResolvedValue({}) },
        address: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(
        async (cb: any) => cb(txMock)
      );

      await POST(
        new Request("http://localhost/api/admin/parks/bulk-upload", {
          method: "POST",
          body: JSON.stringify({
            parks: [
              {
                name: "Test Park",
                slug: "custom-slug",
                state: "CA",
                terrain: ["sand"],
              },
            ],
          }),
        })
      );

      const parkArg = parkCreate.mock.calls[0][0];
      expect(parkArg.data.slug).toBe("custom-slug");
    });

    it("returns 500 when the transaction throws", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      vi.mocked(prisma.$transaction).mockRejectedValue(new Error("boom"));

      const response = await POST(
        new Request("http://localhost/api/admin/parks/bulk-upload", {
          method: "POST",
          body: JSON.stringify({
            parks: [
              { name: "P", state: "CA", terrain: ["sand"] },
            ],
          }),
        })
      );
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors[0]).toMatchObject({ field: "system", message: "boom" });
      consoleErrorSpy.mockRestore();
    });
  });
});
