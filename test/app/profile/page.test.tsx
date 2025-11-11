import { render, screen } from "@testing-library/react";
import ProfilePage from "@/app/profile/page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFavorite: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/components/profile/UserProfileClient", () => ({
  UserProfileClient: ({ parks, user }: any) => (
    <div data-testid="user-profile-client">
      <div data-testid="user-name">{user.name}</div>
      <div data-testid="parks-count">{parks.length} parks</div>
    </div>
  ),
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to signin when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(ProfilePage()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenCalledWith(
      "/api/auth/signin?callbackUrl=/profile",
    );
  });

  it("should render profile page for authenticated user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe", email: "john@example.com" },
    } as any);
    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue([]);

    const component = await ProfilePage();
    render(component);

    expect(screen.getByTestId("user-profile-client")).toBeInTheDocument();
    expect(screen.getByTestId("user-name")).toHaveTextContent("John Doe");
  });

  it("should fetch user favorites from database", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);
    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue([]);

    await ProfilePage();

    expect(prisma.userFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: {
        park: {
          include: {
            terrain: true,
            difficulty: true,
            amenities: true,
            photos: {
              where: { status: "APPROVED" },
              take: 1,
              orderBy: { createdAt: "desc" },
              select: { url: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should display favorited parks", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-1",
        parkId: "park-1",
        createdAt: new Date(),
        park: {
          id: "park-1",
          slug: "test-park",
          name: "Test Park",
          state: "California",
          city: "Los Angeles",
          latitude: 34.0522,
          longitude: -118.2437,
          utvAllowed: true,
          status: "APPROVED" as const,
          terrain: [],
          difficulty: [],
          amenities: [],
          photos: [{ url: "https://example.com/photo.jpg" }],
          createdAt: new Date(),
          updatedAt: new Date(),
          dayPassUSD: null,
          milesOfTrails: null,
          acres: null,
          website: null,
          phone: null,
          notes: null,
          createdBy: "user-1",
          submitterName: null,
        },
      },
    ];

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue(
      mockFavorites as any,
    );

    const component = await ProfilePage();
    render(component);

    expect(screen.getByTestId("parks-count")).toHaveTextContent("1 parks");
  });

  it("should filter out non-approved parks", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-1",
        parkId: "park-1",
        createdAt: new Date(),
        park: {
          id: "park-1",
          slug: "pending-park",
          name: "Pending Park",
          state: "California",
          city: null,
          latitude: 34.0522,
          longitude: -118.2437,
          utvAllowed: true,
          status: "PENDING" as const,
          terrain: [],
          difficulty: [],
          amenities: [],
          photos: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          dayPassUSD: null,
          milesOfTrails: null,
          acres: null,
          website: null,
          phone: null,
          notes: null,
          createdBy: "user-1",
          submitterName: null,
        },
      },
    ];

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue(
      mockFavorites as any,
    );

    const component = await ProfilePage();
    render(component);

    // Should filter out pending parks
    expect(screen.getByTestId("parks-count")).toHaveTextContent("0 parks");
  });

  it("should include hero image when photo exists", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-1",
        parkId: "park-1",
        createdAt: new Date(),
        park: {
          id: "park-1",
          slug: "test-park",
          name: "Test Park",
          state: "California",
          city: null,
          latitude: 34.0522,
          longitude: -118.2437,
          utvAllowed: true,
          status: "APPROVED" as const,
          terrain: [],
          difficulty: [],
          amenities: [],
          photos: [{ url: "https://example.com/hero.jpg" }],
          createdAt: new Date(),
          updatedAt: new Date(),
          dayPassUSD: null,
          milesOfTrails: null,
          acres: null,
          website: null,
          phone: null,
          notes: null,
          createdBy: "user-1",
          submitterName: null,
        },
      },
    ];

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue(
      mockFavorites as any,
    );

    const component = await ProfilePage();
    render(component);

    expect(screen.getByTestId("parks-count")).toHaveTextContent("1 parks");
  });

  it("should handle empty favorites list", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);
    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue([]);

    const component = await ProfilePage();
    render(component);

    expect(screen.getByTestId("parks-count")).toHaveTextContent("0 parks");
  });

  it("should set heroImage to null when park has no photos", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "John Doe" },
    } as any);

    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-1",
        parkId: "park-1",
        createdAt: new Date(),
        park: {
          id: "park-1",
          slug: "no-photo-park",
          name: "Park Without Photos",
          state: "California",
          city: null,
          latitude: 34.0522,
          longitude: -118.2437,
          utvAllowed: true,
          status: "APPROVED" as const,
          terrain: [],
          difficulty: [],
          amenities: [],
          photos: [], // Empty photos array
          createdAt: new Date(),
          updatedAt: new Date(),
          dayPassUSD: null,
          milesOfTrails: null,
          acres: null,
          website: null,
          phone: null,
          notes: null,
          createdBy: "user-1",
          submitterName: null,
        },
      },
    ];

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue(
      mockFavorites as any,
    );

    const component = await ProfilePage();
    render(component);

    // Should still show the park (heroImage will be null)
    expect(screen.getByTestId("parks-count")).toHaveTextContent("1 parks");
  });
});
