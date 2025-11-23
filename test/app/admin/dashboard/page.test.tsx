import { render, screen } from "@testing-library/react";
import AdminDashboard from "@/app/admin/dashboard/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    parkPhoto: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    parkReview: {
      count: vi.fn(),
    },
  },
}));

vi.mock("next/image", () => ({
  default: ({ src, alt, fill }: any) => (
    <img src={src} alt={alt} data-fill={fill} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render dashboard title", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("should display total parks stat", async () => {
    vi.mocked(prisma.park.count).mockImplementation((args?: any) => {
      if (!args?.where) return Promise.resolve(42) as any;
      if (args.where.status === "PENDING") return Promise.resolve(5) as any;
      if (args.where.status === "APPROVED") return Promise.resolve(35) as any;
      if (args.where.status === "REJECTED") return Promise.resolve(2) as any;
      return Promise.resolve(0) as any;
    });
    vi.mocked(prisma.user.count).mockResolvedValue(100);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(10);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Total Parks")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should display pending parks stat", async () => {
    vi.mocked(prisma.park.count).mockImplementation((args?: any) => {
      if (!args?.where) return Promise.resolve(50) as any;
      if (args.where.status === "PENDING") return Promise.resolve(12) as any;
      return Promise.resolve(0) as any;
    });
    vi.mocked(prisma.user.count).mockResolvedValue(100);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(5);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Pending Parks")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("should display pending photos stat", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(8);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Pending Photos")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("should display total users stat", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(250);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("should display recent pending parks section", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Recent Pending Parks")).toBeInTheDocument();
  });

  it("should show empty state when no pending parks", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("No pending parks to review")).toBeInTheDocument();
  });

  it("should display recent pending parks", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);

    const mockPendingParks = [
      {
        id: "park-1",
        name: "Test Park One",
        createdAt: new Date("2024-01-15"),
        submitterName: "John Doe",
        address: {
          city: "Los Angeles",
          state: "California",
        },
      },
      {
        id: "park-2",
        name: "Test Park Two",
        createdAt: new Date("2024-01-20"),
        submitterName: null,
        address: {
          city: null,
          state: "Nevada",
        },
      },
    ];

    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) => {
      if (args?.where?.status === "PENDING") {
        return Promise.resolve(mockPendingParks as any) as any;
      }
      return Promise.resolve([]) as any;
    });
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.getByText("Test Park Two")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles, California")).toBeInTheDocument();
    expect(screen.getByText("Nevada")).toBeInTheDocument();
  });

  it("should show Anonymous for parks without submitter name", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);

    const mockPendingParks = [
      {
        id: "park-1",
        name: "Test Park",
        createdAt: new Date("2024-01-15"),
        submitterName: null,
        address: {
          city: "Test City",
          state: "Test State",
        },
      },
    ];

    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) => {
      if (args?.where?.status === "PENDING") {
        return Promise.resolve(mockPendingParks as any) as any;
      }
      return Promise.resolve([]) as any;
    });
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText(/submitted by: anonymous/i)).toBeInTheDocument();
  });

  it("should render review links for pending parks", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);

    const mockPendingParks = [
      {
        id: "park-123",
        name: "Test Park",
        createdAt: new Date(),
        submitterName: "Test User",
        address: {
          city: "Test City",
          state: "Test State",
        },
      },
    ];

    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) => {
      if (args?.where?.status === "PENDING") {
        return Promise.resolve(mockPendingParks as any) as any;
      }
      return Promise.resolve([]) as any;
    });
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    const reviewLink = screen.getByRole("link", { name: /review/i });
    expect(reviewLink).toHaveAttribute(
      "href",
      "/admin/parks?highlight=park-123",
    );
  });

  it("should display recent photos section", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Recent Photos")).toBeInTheDocument();
  });

  it("should show View All link for photos", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink).toHaveAttribute("href", "/admin/photos");
  });

  it("should show empty state when no photos", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("No photos uploaded yet")).toBeInTheDocument();
  });

  it("should display recent photos", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    const mockPhotos = [
      {
        id: "photo-1",
        url: "https://example.com/photo1.jpg",
        caption: "Test Photo",
        status: "PENDING",
        park: {
          name: "Test Park",
          slug: "test-park",
        },
        user: {
          name: "John Doe",
        },
      },
    ];

    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue(mockPhotos as any);

    const component = await AdminDashboard();
    const { container } = render(component);

    const images = container.querySelectorAll("img");
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("should render all five stat cards", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(10);
    vi.mocked(prisma.user.count).mockResolvedValue(50);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(5);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(3);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    const component = await AdminDashboard();
    render(component);

    expect(screen.getByText("Total Parks")).toBeInTheDocument();
    expect(screen.getByText("Pending Parks")).toBeInTheDocument();
    expect(screen.getByText("Pending Photos")).toBeInTheDocument();
    expect(screen.getByText("Pending Reviews")).toBeInTheDocument();
    expect(screen.getByText("Total Users")).toBeInTheDocument();
  });

  it("should fetch limited number of pending parks", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    await AdminDashboard();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
        take: 5,
      }),
    );
  });

  it("should fetch limited number of recent photos", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([]);

    await AdminDashboard();

    expect(prisma.parkPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 8,
      }),
    );
  });
});
