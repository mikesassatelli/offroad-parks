import { render, screen } from "@testing-library/react";
import AdminPhotosPage from "@/app/admin/photos/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkPhoto: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/components/admin/PhotoModerationTable", () => ({
  PhotoModerationTable: ({ photos }: any) => (
    <div data-testid="photo-moderation-table">
      <div data-testid="photos-count">{photos.length} photos</div>
    </div>
  ),
}));

describe("AdminPhotosPage", () => {
  const mockPhotos = [
    {
      id: "photo-1",
      url: "https://example.com/photo1.jpg",
      caption: "Test Photo 1",
      status: "PENDING",
      createdAt: new Date(),
      park: { name: "Test Park 1", slug: "test-park-1" },
      user: { name: "John Doe", email: "john@example.com" },
    },
    {
      id: "photo-2",
      url: "https://example.com/photo2.jpg",
      caption: "Test Photo 2",
      status: "APPROVED",
      createdAt: new Date(),
      park: { name: "Test Park 2", slug: "test-park-2" },
      user: { name: "Jane Smith", email: "jane@example.com" },
    },
    {
      id: "photo-3",
      url: "https://example.com/photo3.jpg",
      caption: "Test Photo 3",
      status: "REJECTED",
      createdAt: new Date(),
      park: { name: "Test Park 3", slug: "test-park-3" },
      user: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page title", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminPhotosPage();
    render(component);

    expect(screen.getByText("Photo Moderation")).toBeInTheDocument();
  });

  it("should render page description", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminPhotosPage();
    render(component);

    expect(
      screen.getByText(/review and moderate user-submitted park photos/i),
    ).toBeInTheDocument();
  });

  it("should fetch all photos", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    await AdminPhotosPage();

    expect(prisma.parkPhoto.findMany).toHaveBeenCalledWith({
      include: {
        park: {
          select: {
            name: true,
            slug: true,
          },
        },
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
  });

  it("should display pending count", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const component = await AdminPhotosPage();
    const { container } = render(component);

    // Find the pending stat card by its label, then check the count
    const pendingCards = Array.from(container.querySelectorAll(".bg-white"));
    const pendingCard = pendingCards.find((card) =>
      card.textContent?.includes("Pending Review"),
    );
    expect(pendingCard?.querySelector(".text-orange-600")?.textContent).toBe(
      "1",
    );
  });

  it("should display approved count", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const component = await AdminPhotosPage();
    render(component);

    expect(screen.getByText("Approved")).toBeInTheDocument();
    const counts = screen.getAllByText("1");
    expect(counts.length).toBeGreaterThan(0);
  });

  it("should display rejected count", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const component = await AdminPhotosPage();
    render(component);

    expect(screen.getByText("Rejected")).toBeInTheDocument();
  });

  it("should pass photos to moderation table", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const component = await AdminPhotosPage();
    render(component);

    expect(screen.getByTestId("photo-moderation-table")).toBeInTheDocument();
    expect(screen.getByTestId("photos-count")).toHaveTextContent("3 photos");
  });

  it("should handle empty photos list", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminPhotosPage();
    const { container } = render(component);

    // Check all counts are 0
    const pendingCards = Array.from(container.querySelectorAll(".bg-white"));
    const pendingCard = pendingCards.find((card) =>
      card.textContent?.includes("Pending Review"),
    );
    expect(pendingCard?.querySelector(".text-orange-600")?.textContent).toBe(
      "0",
    );

    expect(screen.getByTestId("photos-count")).toHaveTextContent("0 photos");
  });

  it("should count pending photos correctly", async () => {
    const pendingOnly = [
      { ...mockPhotos[0], status: "PENDING" },
      { ...mockPhotos[1], status: "PENDING" },
      { ...mockPhotos[2], status: "APPROVED" },
    ];
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(pendingOnly as any);

    const component = await AdminPhotosPage();
    render(component);

    const pendingCount = screen.getAllByText("2")[0]; // First "2" should be pending count
    expect(pendingCount).toBeInTheDocument();
  });

  it("should count approved photos correctly", async () => {
    const approvedOnly = [
      { ...mockPhotos[0], status: "APPROVED" },
      { ...mockPhotos[1], status: "APPROVED" },
      { ...mockPhotos[2], status: "APPROVED" },
    ];
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(approvedOnly as any);

    const component = await AdminPhotosPage();
    render(component);

    const approvedCounts = screen.getAllByText("3");
    expect(approvedCounts.length).toBeGreaterThan(0);
  });

  it("should count rejected photos correctly", async () => {
    const rejectedOnly = [
      { ...mockPhotos[0], status: "REJECTED" },
      { ...mockPhotos[1], status: "REJECTED" },
    ];
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(rejectedOnly as any);

    const component = await AdminPhotosPage();
    render(component);

    const rejectedCount = screen.getAllByText("2")[0];
    expect(rejectedCount).toBeInTheDocument();
  });

  it("should render stats grid", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const { container } = render(await AdminPhotosPage());

    const statsGrid = container.querySelector(".grid");
    expect(statsGrid).toBeInTheDocument();
    expect(statsGrid).toHaveClass("md:grid-cols-3");
  });

  it("should render camera icon", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const { container } = render(await AdminPhotosPage());

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should order photos by created date descending", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    await AdminPhotosPage();

    expect(prisma.parkPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
