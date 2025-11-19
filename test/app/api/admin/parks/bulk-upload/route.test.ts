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
    parkDifficulty: {
      create: vi.fn(),
    },
    parkAmenity: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
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
      difficulty: ["moderate"],
      amenities: [],
      
      camping: [],vehicleTypes: [],
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
            state: "Utah",
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
        parkDifficulty: {
          create: vi.fn().mockResolvedValue({}),
        },
        parkAmenity: {
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
});
