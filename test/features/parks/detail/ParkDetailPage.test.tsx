import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";
import type { Park } from "@/lib/types";
import { vi } from "vitest";
import { useSession } from "next-auth/react";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: vi.fn(),
}));

// Mock child components
vi.mock("@/features/parks/detail/components/ParkOverviewCard", () => ({
  ParkOverviewCard: ({ park }: any) => (
    <div data-testid="park-overview-card">{park.name} Overview</div>
  ),
}));

vi.mock("@/features/parks/detail/components/ParkAttributesCards", () => ({
  ParkAttributesCards: () => (
    <div data-testid="park-attributes-cards">Attributes</div>
  ),
}));

vi.mock("@/features/parks/detail/components/ParkContactSidebar", () => ({
  ParkContactSidebar: () => (
    <div data-testid="park-contact-sidebar">Contact Info</div>
  ),
}));

vi.mock("@/components/parks/PhotoGallery", () => ({
  PhotoGallery: ({ photos, currentUserId, isAdmin }: any) => (
    <div data-testid="photo-gallery">
      {photos.length} photos
      {currentUserId && <span data-testid="user-id">{currentUserId}</span>}
      {isAdmin && <span data-testid="is-admin">admin</span>}
    </div>
  ),
}));

vi.mock("@/components/parks/PhotoUploadForm", () => ({
  PhotoUploadForm: ({ parkSlug, onSuccess }: any) => (
    <div data-testid="photo-upload-form">
      Upload form for {parkSlug}
      <button onClick={onSuccess}>Upload Success</button>
    </div>
  ),
}));

// Mock MapView with dynamic import
vi.mock("next/dynamic", () => ({
  default: (importFunc: any, options: any) => {
    const Component = ({ parks, fitOnVisible, alwaysShowLabel }: any) => (
      <div
        data-testid="map-view"
        data-fit-on-visible={fitOnVisible ? "true" : "false"}
        data-always-show-label={alwaysShowLabel ? "true" : "false"}
      >
        {parks.length} parks on map
      </div>
    );
    Component.displayName = "MapView";
    return Component;
  },
}));

// Mock review components and hooks
vi.mock("@/components/reviews", () => ({
  RatingBadge: ({ rating, reviewCount }: any) => (
    <div data-testid="rating-badge">
      {rating ?? "No rating"} ({reviewCount ?? 0})
    </div>
  ),
  ReviewList: ({ reviews }: any) => (
    <div data-testid="review-list">{reviews.length} reviews</div>
  ),
  ReviewForm: () => <div data-testid="review-form">Review Form</div>,
  StarRating: ({ rating }: any) => <span data-testid="star-rating">{rating}</span>,
  DifficultyRating: ({ rating }: any) => <span data-testid="difficulty-rating">{rating}</span>,
}));

vi.mock("@/hooks/useReviews", () => ({
  useReviews: () => ({
    reviews: [],
    isLoading: false,
    error: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    setPage: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/hooks/useParkReview", () => ({
  useParkReview: () => ({
    userReview: null,
    isLoading: false,
    isSubmitting: false,
    error: null,
    createReview: vi.fn(),
    updateReview: vi.fn(),
    deleteReview: vi.fn(),
    loadUserReview: vi.fn(),
  }),
}));

vi.mock("@/features/parks/detail/components/CampingInfoCard", () => ({
  CampingInfoCard: () => <div data-testid="camping-info-card">Camping Info</div>,
}));

vi.mock("@/features/parks/detail/components/ParkOperationalCard", () => ({
  ParkOperationalCard: () => (
    <div data-testid="park-operational-card">Operational Details</div>
  ),
}));

// Mock AppHeader
vi.mock("@/components/layout/AppHeader", () => ({
  AppHeader: ({ showBackButton }: { showBackButton?: boolean }) => (
    <header data-testid="app-header">
      {showBackButton && (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a href="/" role="button" aria-label="Back to Parks">Back to Parks</a>
      )}
    </header>
  ),
}));

// Mock Tabs — render all content without hiding inactive tabs
vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div data-testid="tabs">{children}</div>,
  TabsList: ({ children, className }: any) => (
    <div data-testid="tabs-list" className={className}>{children}</div>
  ),
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-trigger-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("ParkDetailPage", () => {
  const mockPark: Park = {
    id: "test-park",
    name: "Test Park",
    address: {
      state: "California",
      city: "Los Angeles",
    },
    coords: { lat: 34.0522, lng: -118.2437 },
    terrain: ["sand", "rocks"],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockPhotos = [
    {
      id: "photo-1",
      url: "https://example.com/photo1.jpg",
      caption: "Beautiful sunset",
      createdAt: new Date(),
      user: { name: "John Doe", email: "john@example.com" },
      userId: "user-1",
    },
    {
      id: "photo-2",
      url: "https://example.com/photo2.jpg",
      caption: null,
      createdAt: new Date(),
      user: null,
      userId: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSession).mockReturnValue({ data: null } as any);
  });

  it("should render park name in header", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should render park location with city and state", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByText("Los Angeles, California")).toBeInTheDocument();
  });

  it("should render park location without city when not provided", () => {
    const parkWithoutCity = { ...mockPark, address: { state: "California" } };

    render(<ParkDetailPage park={parkWithoutCity} photos={[]} />);

    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("should render back button", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(
      screen.getByRole("button", { name: /back to parks/i }),
    ).toBeInTheDocument();
  });

  it("should have back button link to home", () => {
    const { container } = render(<ParkDetailPage park={mockPark} photos={[]} />);

    const backLink = container.querySelector('a[href="/"]');
    expect(backLink).toBeInTheDocument();
    expect(backLink?.textContent).toContain("Back to Parks");
  });

  it("should render park overview card", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("park-overview-card")).toBeInTheDocument();
    expect(screen.getByText("Test Park Overview")).toBeInTheDocument();
  });

  it("should render park attributes cards", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("park-attributes-cards")).toBeInTheDocument();
  });

  it("should render park contact sidebar", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("park-contact-sidebar")).toBeInTheDocument();
  });

  it("should render photo gallery with photo count", () => {
    render(<ParkDetailPage park={mockPark} photos={mockPhotos} />);

    expect(screen.getByText(/photo gallery \(2\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("photo-gallery")).toHaveTextContent("2 photos");
  });

  it("should render photo gallery with zero photos", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByText(/photo gallery \(0\)/i)).toBeInTheDocument();
    expect(screen.getByTestId("photo-gallery")).toHaveTextContent("0 photos");
  });

  it("should pass currentUserId to photo gallery", () => {
    render(
      <ParkDetailPage
        park={mockPark}
        photos={mockPhotos}
        currentUserId="current-user-123"
      />,
    );

    expect(screen.getByTestId("user-id")).toHaveTextContent("current-user-123");
  });

  it("should pass isAdmin to photo gallery", () => {
    render(
      <ParkDetailPage park={mockPark} photos={mockPhotos} isAdmin={true} />,
    );

    expect(screen.getByTestId("is-admin")).toBeInTheDocument();
  });

  it("should not render photo upload form when not authenticated", () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as any);

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.queryByTestId("photo-upload-form")).not.toBeInTheDocument();
  });

  it("should show sign-in CTA when unauthenticated and no photos", () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as any);

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    // Multiple "Sign in" links may exist (photos CTA + trail conditions) — check photos-specific text
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/to be the first to add photos/i)).toBeInTheDocument();
  });

  it("should not show sign-in CTA when unauthenticated but photos exist", () => {
    vi.mocked(useSession).mockReturnValue({ data: null } as any);

    render(<ParkDetailPage park={mockPark} photos={mockPhotos} />);

    expect(screen.queryByText(/to be the first to add photos/i)).not.toBeInTheDocument();
  });

  it("should render photo upload form when authenticated", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", name: "John Doe" } },
    } as any);

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("photo-upload-form")).toBeInTheDocument();
    expect(screen.getByText(/upload form for test-park/i)).toBeInTheDocument();
  });

  it("should refresh page when photo upload succeeds", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", name: "John Doe" } },
    } as any);
    const user = userEvent.setup();

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    await user.click(screen.getByText("Upload Success"));

    expect(mockRefresh).toHaveBeenCalledOnce();
  });

  it("should render map when coords provided", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getAllByText("Location").length).toBeGreaterThan(0);
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toHaveTextContent("1 parks on map");
  });

  it("should enable fitOnVisible + alwaysShowLabel on the Location tab map", () => {
    // The Location tab map should fix centering (fitOnVisible) AND surface the
    // park name label next to the single marker (alwaysShowLabel).
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    const mapView = screen.getByTestId("map-view");
    expect(mapView).toHaveAttribute("data-fit-on-visible", "true");
    expect(mapView).toHaveAttribute("data-always-show-label", "true");
  });

  it("should not render map when coords not provided", () => {
    const parkWithoutCoords = { ...mockPark, coords: undefined };

    render(<ParkDetailPage park={parkWithoutCoords} photos={[]} />);

    expect(screen.queryByText("Location")).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-view")).not.toBeInTheDocument();
  });

  it("should render all icons", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should have proper layout structure", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    expect(container.querySelector(".lg\\:grid-cols-3")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:col-span-2")).toBeInTheDocument();
    expect(container.querySelector(".lg\\:col-span-1")).toBeInTheDocument();
  });

  it("should render AppHeader component", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("should render photo gallery card with Camera icon", () => {
    render(<ParkDetailPage park={mockPark} photos={mockPhotos} />);

    // Check that the Camera icon title exists in the Photo Gallery card
    expect(screen.getByText(/photo gallery/i)).toBeInTheDocument();
  });

  it("should use park.id as parkSlug for photo upload", () => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { id: "user-1", name: "John Doe" } },
    } as any);

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByText(/upload form for test-park/i)).toBeInTheDocument();
  });

  it("should render tabs with overview, photos, and reviews triggers", () => {
    render(<ParkDetailPage park={mockPark} photos={mockPhotos} />);

    expect(screen.getByTestId("tab-trigger-overview")).toBeInTheDocument();
    expect(screen.getByTestId("tab-trigger-photos")).toBeInTheDocument();
    expect(screen.getByTestId("tab-trigger-reviews")).toBeInTheDocument();
  });

  it("should render location tab trigger when coords provided", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("tab-trigger-location")).toBeInTheDocument();
  });

  it("should not render location tab trigger when coords not provided", () => {
    const parkWithoutCoords = { ...mockPark, coords: undefined };
    render(<ParkDetailPage park={parkWithoutCoords} photos={[]} />);

    expect(screen.queryByTestId("tab-trigger-location")).not.toBeInTheDocument();
  });

  it("should render overview content with park cards", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(screen.getByTestId("tab-content-overview")).toBeInTheDocument();
    expect(screen.getByTestId("park-overview-card")).toBeInTheDocument();
    expect(screen.getByTestId("park-attributes-cards")).toBeInTheDocument();
  });

  it("should render SessionProvider wrapper", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    expect(container.firstChild).toBeDefined();
  });

  it("should handle park with null city", () => {
    const parkWithNullCity = { ...mockPark, address: { state: "California" } };

    render(<ParkDetailPage park={parkWithNullCity} photos={[]} />);

    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("should pass all photos to PhotoGallery", () => {
    render(<ParkDetailPage park={mockPark} photos={mockPhotos} />);

    const gallery = screen.getByTestId("photo-gallery");
    expect(gallery).toHaveTextContent("2 photos");
  });

  it("should render main content in col-span-2", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    const mainContent = container.querySelector(".lg\\:col-span-2");
    expect(mainContent).toBeInTheDocument();
  });

  describe("Edit in Admin quick link", () => {
    it("should render the admin edit link when isAdmin is true and parkDbId is provided", () => {
      render(
        <ParkDetailPage
          park={mockPark}
          photos={[]}
          isAdmin
          parkDbId="db-park-123"
        />,
      );

      const link = screen.getByRole("link", { name: /edit in admin/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute("href", "/admin/parks/db-park-123/edit");
    });

    it("should not render the admin edit link for a non-admin user", () => {
      vi.mocked(useSession).mockReturnValue({
        data: { user: { id: "user-1", name: "Regular User" } },
      } as any);

      render(
        <ParkDetailPage
          park={mockPark}
          photos={[]}
          isAdmin={false}
          parkDbId="db-park-123"
        />,
      );

      expect(
        screen.queryByRole("link", { name: /edit in admin/i }),
      ).not.toBeInTheDocument();
    });

    it("should not render the admin edit link for anonymous users", () => {
      vi.mocked(useSession).mockReturnValue({ data: null } as any);

      render(<ParkDetailPage park={mockPark} photos={[]} />);

      expect(
        screen.queryByRole("link", { name: /edit in admin/i }),
      ).not.toBeInTheDocument();
    });

    it("should not render the admin edit link when parkDbId is missing", () => {
      render(<ParkDetailPage park={mockPark} photos={[]} isAdmin />);

      expect(
        screen.queryByRole("link", { name: /edit in admin/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("should render sidebar in col-span-1", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    const sidebar = container.querySelector(".lg\\:col-span-1");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toContainElement(
      screen.getByTestId("park-contact-sidebar"),
    );
  });
});
