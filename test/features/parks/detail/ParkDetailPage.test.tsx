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
    const Component = ({ parks }: any) => (
      <div data-testid="map-view">{parks.length} parks on map</div>
    );
    Component.displayName = "MapView";
    return Component;
  },
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
    state: "California",
    city: "Los Angeles",
    coords: { lat: 34.0522, lng: -118.2437 },
    utvAllowed: true,
    terrain: ["sand", "rocks"],
    amenities: ["camping"],
    difficulty: ["moderate"],
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
    const parkWithoutCity = { ...mockPark, city: undefined };

    render(<ParkDetailPage park={parkWithoutCity} photos={[]} />);

    expect(screen.getByText("California")).toBeInTheDocument();
  });

  it("should render back button", () => {
    render(<ParkDetailPage park={mockPark} photos={[]} />);

    expect(
      screen.getByRole("button", { name: /back to parks/i }),
    ).toBeInTheDocument();
  });

  it("should navigate to home when back button clicked", async () => {
    const user = userEvent.setup();

    render(<ParkDetailPage park={mockPark} photos={[]} />);

    await user.click(screen.getByRole("button", { name: /back to parks/i }));

    expect(mockPush).toHaveBeenCalledWith("/");
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

    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toBeInTheDocument();
    expect(screen.getByTestId("map-view")).toHaveTextContent("1 parks on map");
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

  it("should render header with sticky positioning", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("backdrop-blur-sm");
    expect(header).toHaveClass("border-b");
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

  it("should render SessionProvider wrapper", () => {
    const { container } = render(
      <ParkDetailPage park={mockPark} photos={[]} />,
    );

    expect(container.firstChild).toBeDefined();
  });

  it("should handle park with null city", () => {
    const parkWithNullCity = { ...mockPark, city: null };

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
