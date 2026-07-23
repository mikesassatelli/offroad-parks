import { render, screen } from "@testing-library/react";
import AdminDashboard from "@/app/admin/dashboard/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: { count: vi.fn(), findMany: vi.fn() },
    parkPhoto: { count: vi.fn(), findMany: vi.fn() },
    parkReview: { count: vi.fn() },
    trailCondition: { count: vi.fn() },
    parkClaim: { count: vi.fn() },
    fieldExtraction: { count: vi.fn() },
    researchSession: { count: vi.fn(), aggregate: vi.fn(), findMany: vi.fn() },
  },
}));

// Recharts client component — stubbed so the test doesn't depend on SVG rendering.
vi.mock("@/components/admin/DashboardCharts", () => ({
  DashboardCharts: () => <div data-testid="dashboard-charts" />,
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
    vi.mocked(prisma.park.count).mockResolvedValue(0);
    vi.mocked(prisma.parkPhoto.count).mockResolvedValue(0);
    vi.mocked(prisma.parkReview.count).mockResolvedValue(0);
    vi.mocked(prisma.trailCondition.count).mockResolvedValue(0);
    vi.mocked(prisma.parkClaim.count).mockResolvedValue(0);
    vi.mocked(prisma.fieldExtraction.count).mockResolvedValue(0);
    vi.mocked(prisma.researchSession.count).mockResolvedValue(0);
    vi.mocked(prisma.researchSession.aggregate).mockResolvedValue({
      _sum: { estimatedCostUSD: 0 },
    } as any);
    vi.mocked(prisma.researchSession.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.park.findMany).mockResolvedValue([] as any);
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([] as any);
  });

  it("renders the dashboard title and sections", async () => {
    render(await AdminDashboard());

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("AI data pipeline")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-charts")).toBeInTheDocument();
  });

  it("renders the attention queues with deep links", async () => {
    render(await AdminDashboard());

    expect(
      screen.getByRole("link", { name: /field reviews/i }),
    ).toHaveAttribute("href", "/admin/ai-research/review");
    expect(
      screen.getByRole("link", { name: /research queue/i }),
    ).toHaveAttribute("href", "/admin/ai-research/research");
    expect(screen.getByRole("link", { name: /park claims/i })).toHaveAttribute(
      "href",
      "/admin/claims",
    );
  });

  it("shows the field-review queue count", async () => {
    vi.mocked(prisma.fieldExtraction.count).mockResolvedValue(9);
    render(await AdminDashboard());

    const link = screen.getByRole("link", { name: /field reviews/i });
    expect(link).toHaveTextContent("9");
  });

  it("renders the AI pipeline stats including total cost", async () => {
    vi.mocked(prisma.researchSession.aggregate).mockResolvedValue({
      _sum: { estimatedCostUSD: 12.5 },
    } as any);
    render(await AdminDashboard());

    expect(screen.getByText("Total cost")).toBeInTheDocument();
    expect(screen.getByText("$12.50")).toBeInTheDocument();
    expect(screen.getByText("Researched")).toBeInTheDocument();
  });

  it("renders recent pending parks", async () => {
    const mockPendingParks = [
      {
        id: "park-1",
        name: "Test Park One",
        createdAt: new Date("2024-01-15"),
        submitterName: "John Doe",
        address: { city: "Los Angeles", state: "California" },
      },
      {
        id: "park-2",
        name: "Test Park Two",
        createdAt: new Date("2024-01-20"),
        submitterName: null,
        address: { city: null, state: "Nevada" },
      },
    ];
    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) =>
      args?.where?.status === "PENDING"
        ? (Promise.resolve(mockPendingParks) as any)
        : (Promise.resolve([]) as any),
    );

    render(await AdminDashboard());

    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.getByText("Los Angeles, California")).toBeInTheDocument();
    expect(screen.getByText("Nevada")).toBeInTheDocument();
  });

  it("shows Anonymous for parks without a submitter name", async () => {
    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) =>
      args?.where?.status === "PENDING"
        ? (Promise.resolve([
            {
              id: "park-1",
              name: "Test Park",
              createdAt: new Date("2024-01-15"),
              submitterName: null,
              address: { city: "Test City", state: "Test State" },
            },
          ]) as any)
        : (Promise.resolve([]) as any),
    );

    render(await AdminDashboard());
    expect(screen.getByText(/submitted by: anonymous/i)).toBeInTheDocument();
  });

  it("links a pending park to its review", async () => {
    vi.mocked(prisma.park.findMany).mockImplementation((args?: any) =>
      args?.where?.status === "PENDING"
        ? (Promise.resolve([
            {
              id: "park-123",
              name: "Test Park",
              createdAt: new Date(),
              submitterName: "Test User",
              address: { city: "Test City", state: "Test State" },
            },
          ]) as any)
        : (Promise.resolve([]) as any),
    );

    render(await AdminDashboard());
    expect(screen.getByRole("link", { name: /^review$/i })).toHaveAttribute(
      "href",
      "/admin/parks?highlight=park-123",
    );
  });

  it("shows empty states for pending parks and photos", async () => {
    render(await AdminDashboard());
    expect(screen.getByText("No pending parks to review")).toBeInTheDocument();
    expect(screen.getByText("No photos uploaded yet")).toBeInTheDocument();
  });

  it("renders recent photos with a View All link", async () => {
    vi.mocked(prisma.parkPhoto.findMany).mockResolvedValue([
      {
        id: "photo-1",
        url: "https://example.com/photo1.jpg",
        caption: "Test Photo",
        status: "PENDING",
        park: { name: "Test Park", slug: "test-park" },
        user: { name: "John Doe" },
      },
    ] as any);

    const { container } = render(await AdminDashboard());

    expect(screen.getByText("Recent Photos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute(
      "href",
      "/admin/photos",
    );
    const images = container.querySelectorAll("img");
    expect(images[0]).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("fetches limited pending parks and recent photos", async () => {
    await AdminDashboard();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING" }, take: 5 }),
    );
    expect(prisma.parkPhoto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 8 }),
    );
  });
});
