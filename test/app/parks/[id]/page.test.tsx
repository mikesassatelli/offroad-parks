import { render, screen } from "@testing-library/react";
import ParkPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/parks/[id]/page";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    parkPhoto: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/features/parks/detail/ParkDetailPage", () => ({
  ParkDetailPage: ({ park, photos, currentUserId, isAdmin }: any) => (
    <div data-testid="park-detail-page">
      <h1>{park.name}</h1>
      <div data-testid="park-state">{park.state}</div>
      <div data-testid="photos-count">{photos.length} photos</div>
      <div data-testid="user-id">{currentUserId || "no-user"}</div>
      <div data-testid="is-admin">{isAdmin ? "admin" : "not-admin"}</div>
    </div>
  ),
}));

describe("Park Detail Page", () => {
  const mockDbPark = {
    id: "park-1",
    slug: "test-park",
    name: "Test Park",
    state: "California",
    city: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    dayPassUSD: 25,
    milesOfTrails: 50,
    acres: 1000,website: "https://testpark.com",
    phone: "5551234567",
    notes: "Great park for beginners",
    status: "APPROVED",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: "user-1",
    terrain: [{ id: "1", name: "sand", parkId: "park-1" }],
    difficulty: [{ id: "1", level: "moderate", parkId: "park-1" }],
    amenities: [{ id: "1", name: "camping", parkId: "park-1" }],
    
      camping: [],vehicleTypes: [],
  };

  const mockPhotos = [
    {
      id: "photo-1",
      url: "https://example.com/photo1.jpg",
      caption: "Beautiful sunset",
      status: "APPROVED",
      parkId: "park-1",
      userId: "user-1",
      createdAt: new Date(),
      user: {
        name: "John Doe",
        email: "john@example.com",
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateStaticParams", () => {
    it("should generate static params for approved parks", async () => {
      vi.mocked(prisma.park.findMany).mockResolvedValue([
        { slug: "park-1" },
        { slug: "park-2" },
        { slug: "park-3" },
      ] as any);

      const params = await generateStaticParams();

      expect(params).toEqual([
        { id: "park-1" },
        { id: "park-2" },
        { id: "park-3" },
      ]);
    });

    it("should only include approved parks", async () => {
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await generateStaticParams();

      expect(prisma.park.findMany).toHaveBeenCalledWith({
        where: { status: "APPROVED" },
        select: { slug: true },
      });
    });
  });

  describe("generateMetadata", () => {
    it("should generate metadata for existing park", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "test-park" }),
      });

      expect(metadata.title).toBe("Test Park - UTV Parks");
      expect(metadata.description).toBe("Great park for beginners");
    });

    it("should use fallback description when no notes", async () => {
      const parkWithoutNotes = { ...mockDbPark, notes: null };
      vi.mocked(prisma.park.findUnique).mockResolvedValue(
        parkWithoutNotes as any,
      );

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "test-park" }),
      });

      expect(metadata.description).toBe(
        "Information about Test Park in Los Angeles, California",
      );
    });

    it("should handle park without city in description", async () => {
      const parkWithoutCity = { ...mockDbPark, city: null, notes: null };
      vi.mocked(prisma.park.findUnique).mockResolvedValue(
        parkWithoutCity as any,
      );

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "test-park" }),
      });

      expect(metadata.description).toBe(
        "Information about Test Park in California",
      );
    });

    it("should return not found metadata for non-existent park", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

      const metadata = await generateMetadata({
        params: Promise.resolve({ id: "non-existent" }),
      });

      expect(metadata.title).toBe("Park Not Found");
    });
  });

  describe("ParkPage component", () => {
    it("should render park detail page for authenticated admin", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      } as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(screen.getByText("Test Park")).toBeInTheDocument();
      expect(screen.getByTestId("is-admin")).toHaveTextContent("admin");
    });

    it("should render park detail page for regular user", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-2", role: "USER" },
      } as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(screen.getByTestId("is-admin")).toHaveTextContent("not-admin");
      expect(screen.getByTestId("user-id")).toHaveTextContent("user-2");
    });

    it("should render for unauthenticated user", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);
      vi.mocked(auth).mockResolvedValue(null as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(screen.getByTestId("user-id")).toHaveTextContent("no-user");
      expect(screen.getByTestId("is-admin")).toHaveTextContent("not-admin");
    });

    it("should call notFound for non-existent park", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
      vi.mocked(auth).mockResolvedValue(null as any);
      vi.mocked(notFound).mockImplementation(() => {
        throw new Error("NEXT_NOT_FOUND");
      });

      await expect(
        ParkPage({
          params: Promise.resolve({ id: "non-existent" }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");

      expect(notFound).toHaveBeenCalled();
    });

    it("should fetch park by slug and approved status", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);
      vi.mocked(auth).mockResolvedValue(null as any);

      await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });

      expect(prisma.park.findUnique).toHaveBeenCalledWith({
        where: {
          slug: "test-park",
          status: "APPROVED",
        },
        include: {
          terrain: true,
          difficulty: true,
          amenities: true,
          camping: true,
          vehicleTypes: true,
        },
      });
    });

    it("should fetch approved photos for the park", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);
      vi.mocked(auth).mockResolvedValue(null as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(prisma.parkPhoto.findMany).toHaveBeenCalledWith({
        where: {
          parkId: "park-1",
          status: "APPROVED",
        },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      expect(screen.getByTestId("photos-count")).toHaveTextContent("1 photos");
    });

    it("should handle park with no photos", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);
      vi.mocked(auth).mockResolvedValue(null as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(screen.getByTestId("photos-count")).toHaveTextContent("0 photos");
    });

    it("should pass current user ID to detail page", async () => {
      vi.mocked(prisma.park.findUnique).mockResolvedValue(mockDbPark as any);
      vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);
      vi.mocked(auth).mockResolvedValue({
        user: { id: "current-user-123" },
      } as any);

      const component = await ParkPage({
        params: Promise.resolve({ id: "test-park" }),
      });
      render(component);

      expect(screen.getByTestId("user-id")).toHaveTextContent(
        "current-user-123",
      );
    });
  });
});
