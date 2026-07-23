import { render, screen } from "@testing-library/react";
import AdminParksPage from "@/app/admin/parks/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
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
      amenities: [],
      camping: [],
      vehicleTypes: [],
      address: {
        city: "Test City",
        state: "CA",
      },
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
      amenities: [],
      camping: [],
      vehicleTypes: [],
      address: null,
      submittedBy: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.park.count).mockResolvedValue(2);
    vi.mocked(prisma.park.groupBy).mockResolvedValue([
      { status: "PENDING", _count: { _all: 1 } },
      { status: "APPROVED", _count: { _all: 1 } },
    ] as any);
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
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: {
          where: { status: "APPROVED" },
          select: { id: true },
        },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: 0,
      take: 25,
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
    expect(pendingLink.className).toContain("border-primary");
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

  describe("search", () => {
    it("builds a DB-side OR clause across name/city/state", async () => {
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ search: "dunes" }),
      });

      expect(prisma.park.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: "dunes", mode: "insensitive" } },
              {
                address: {
                  is: { city: { contains: "dunes", mode: "insensitive" } },
                },
              },
              {
                address: {
                  is: { state: { contains: "dunes", mode: "insensitive" } },
                },
              },
            ],
          },
        }),
      );
    });

    it("ANDs the status filter with the search clause when both are present", async () => {
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ status: "approved", search: "dunes" }),
      });

      const call = vi.mocked(prisma.park.findMany).mock.calls[0][0] as any;
      expect(call.where.AND).toHaveLength(2);
      expect(call.where.AND[0]).toEqual({ status: "APPROVED" });
      expect(call.where.AND[1].OR).toHaveLength(3);
    });

    it("trims whitespace and treats a blank search as no filter", async () => {
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ search: "   " }),
      });

      expect(prisma.park.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it("preserves the search term in pagination links", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(75);
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({ search: "dunes", page: "2" }),
      });
      render(component);

      expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
        "href",
        "/admin/parks?search=dunes&page=3",
      );
    });
  });

  describe("pagination", () => {
    it("should request the correct skip/take for a given page", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(60);
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ page: "2" }),
      });

      expect(prisma.park.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      );
    });

    it("should clamp the requested page to the last valid page", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(30); // 2 pages of 25
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ page: "99" }),
      });

      // Page 2 is the last valid page (30 results / 25 per page)
      expect(prisma.park.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 }),
      );
    });

    it("should clamp non-numeric or below-range page values to page 1", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(10);
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      await AdminParksPage({
        searchParams: Promise.resolve({ page: "0" }),
      });

      expect(prisma.park.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 25 }),
      );
    });

    it("should render Page X of Y and both Prev/Next when in the middle", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(75); // 3 pages
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({ page: "2" }),
      });
      render(component);

      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
        "href",
        "/admin/parks?page=1",
      );
      expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
        "href",
        "/admin/parks?page=3",
      );
    });

    it("should not render a Previous link on the first page", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(75);
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({}),
      });
      render(component);

      expect(
        screen.queryByRole("link", { name: "Previous" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Next" })).toBeInTheDocument();
    });

    it("should not render a Next link on the last page", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(50); // 2 pages
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({ page: "2" }),
      });
      render(component);

      expect(
        screen.queryByRole("link", { name: "Next" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Previous" }),
      ).toBeInTheDocument();
    });

    it("should not render pagination controls when there are no results", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(0);
      vi.mocked(prisma.park.findMany).mockResolvedValue([]);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({}),
      });
      render(component);

      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });

    it("should preserve the status filter in pagination links", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(75);
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({ status: "pending", page: "2" }),
      });
      render(component);

      expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
        "href",
        "/admin/parks?status=pending&page=1",
      );
      expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
        "href",
        "/admin/parks?status=pending&page=3",
      );
    });

    it("should reset to page 1 (omit page param) when switching status tabs", async () => {
      vi.mocked(prisma.park.count).mockResolvedValue(75);
      vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

      const component = await AdminParksPage({
        searchParams: Promise.resolve({ status: "pending", page: "2" }),
      });
      render(component);

      const approvedTab = screen.getByRole("link", { name: /approved/i });
      expect(approvedTab).toHaveAttribute(
        "href",
        "/admin/parks?status=approved",
      );

      const allTab = screen.getByRole("link", { name: /all/i });
      expect(allTab).toHaveAttribute("href", "/admin/parks");
    });
  });
});
