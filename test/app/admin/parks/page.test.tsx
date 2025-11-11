import { render, screen } from "@testing-library/react";
import AdminParksPage from "@/app/admin/parks/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/components/admin/ParkManagementTable", () => ({
  ParkManagementTable: ({ parks, highlightId }: any) => (
    <div data-testid="park-management-table">
      <div data-testid="parks-count">{parks.length} parks</div>
      {highlightId && <div data-testid="highlight-id">{highlightId}</div>}
    </div>
  ),
}));

describe("AdminParksPage", () => {
  const mockParks = [
    {
      id: "park-1",
      slug: "test-park-1",
      name: "Test Park 1",
      status: "PENDING",
      createdAt: new Date(),
      terrain: [],
      difficulty: [],
      amenities: [],
      submittedBy: {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
      },
    },
    {
      id: "park-2",
      slug: "test-park-2",
      name: "Test Park 2",
      status: "APPROVED",
      createdAt: new Date(),
      terrain: [],
      difficulty: [],
      amenities: [],
      submittedBy: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render page title", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    expect(screen.getByText("Park Management")).toBeInTheDocument();
  });

  it("should render Add New Park link", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    const addLink = screen.getByRole("link", { name: /add new park/i });
    expect(addLink).toHaveAttribute("href", "/admin/parks/new");
  });

  it("should fetch all parks by default", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    await AdminParksPage({
      searchParams: Promise.resolve({}),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith({
      where: {},
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  });

  it("should filter parks by status", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    await AdminParksPage({
      searchParams: Promise.resolve({ status: "pending" }),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      }),
    );
  });

  it("should filter by approved status", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    await AdminParksPage({
      searchParams: Promise.resolve({ status: "approved" }),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "APPROVED" },
      }),
    );
  });

  it("should filter by rejected status", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    await AdminParksPage({
      searchParams: Promise.resolve({ status: "rejected" }),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "REJECTED" },
      }),
    );
  });

  it("should filter by draft status", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    await AdminParksPage({
      searchParams: Promise.resolve({ status: "draft" }),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "DRAFT" },
      }),
    );
  });

  it("should render status filter tabs", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    expect(screen.getByRole("link", { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pending/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /approved/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /rejected/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /draft/i })).toBeInTheDocument();
  });

  it("should display park counts in filter tabs", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    // Should show counts for each status
    const allLink = screen.getByRole("link", { name: /all/i });
    expect(allLink.textContent).toContain("2"); // Total parks
  });

  it("should pass parks to management table", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    expect(screen.getByTestId("park-management-table")).toBeInTheDocument();
    expect(screen.getByTestId("parks-count")).toHaveTextContent("2 parks");
  });

  it("should pass highlight ID to management table", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({ highlight: "park-123" }),
    });
    render(component);

    expect(screen.getByTestId("highlight-id")).toHaveTextContent("park-123");
  });

  it("should handle empty parks list", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({}),
    });
    render(component);

    expect(screen.getByTestId("parks-count")).toHaveTextContent("0 parks");
  });

  it("should set active tab styling for current filter", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    const component = await AdminParksPage({
      searchParams: Promise.resolve({ status: "pending" }),
    });
    const { container } = render(component);

    const pendingLink = screen.getByRole("link", { name: /pending/i });
    expect(pendingLink.className).toContain("border-blue-500");
  });

  it("should convert status to uppercase for where clause", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    await AdminParksPage({
      searchParams: Promise.resolve({ status: "pending" }),
    });

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" }, // Uppercase
      }),
    );
  });
});
