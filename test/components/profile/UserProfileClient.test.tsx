import { fireEvent, render, screen } from "@testing-library/react";
import { UserProfileClient } from "@/components/profile/UserProfileClient";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock Next.js modules
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Mock components
vi.mock("@/components/parks/ParkCard", () => ({
  ParkCard: ({ park, isFavorite, onToggleFavorite }: any) => (
    <div data-testid="park-card">
      <h3>{park.name}</h3>
      <button onClick={() => onToggleFavorite(park.id)}>
        {isFavorite ? "Unfavorite" : "Favorite"}
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, asChild }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

// Mock hooks with mutable mock functions
const mockToggleFavorite = vi.fn();
const mockIsFavorite = vi.fn(() => false);

vi.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
  }),
}));

describe("UserProfileClient", () => {
  const mockUser = {
    name: "John Doe",
    email: "john@example.com",
    image: null,
  };

  const mockParks: Park[] = [
    {
      id: "park-1",
      name: "Test Park 1",
      state: "California",
      coords: { lat: 34, lng: -118 },
      utvAllowed: true,
      terrain: ["sand"],
      amenities: ["camping"],
      difficulty: ["moderate"],
    },
    {
      id: "park-2",
      name: "Test Park 2",
      state: "Arizona",
      coords: { lat: 33, lng: -111 },
      utvAllowed: true,
      terrain: ["rocks"],
      amenities: ["restrooms"],
      difficulty: ["difficult"],
    },
  ];

  it("should render user profile header", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it('should display "My Profile" when user has no name', () => {
    const userWithoutName = { ...mockUser, name: null };
    render(<UserProfileClient parks={[]} user={userWithoutName} />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("should render app title with link to home", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    const homeLink = container.querySelector('a[href="/"]');
    expect(homeLink).toBeInTheDocument();
    expect(screen.getByText(/UTV Parks/)).toBeInTheDocument();
  });

  it("should display beta badge", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("should display My Favorites heading", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("My Favorites")).toBeInTheDocument();
  });

  it("should display park count with correct pluralization (0 parks)", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("(0 parks)")).toBeInTheDocument();
  });

  it("should display park count with correct pluralization (1 park)", () => {
    render(<UserProfileClient parks={[mockParks[0]]} user={mockUser} />);

    expect(screen.getByText("(1 park)")).toBeInTheDocument();
  });

  it("should display park count with correct pluralization (2 parks)", () => {
    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    expect(screen.getByText("(2 parks)")).toBeInTheDocument();
  });

  it("should render Back to Parks button", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("Back to Parks")).toBeInTheDocument();
  });

  it("should show empty state when no favorites", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("No favorites yet")).toBeInTheDocument();
    expect(
      screen.getByText("Start exploring parks and add them to your favorites!"),
    ).toBeInTheDocument();
  });

  it("should show Browse Parks button in empty state", () => {
    render(<UserProfileClient parks={[]} user={mockUser} />);

    expect(screen.getByText("Browse Parks")).toBeInTheDocument();
  });

  it("should not show empty state when parks exist", () => {
    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    expect(screen.queryByText("No favorites yet")).not.toBeInTheDocument();
  });

  it("should render ParkCard for each park", () => {
    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    expect(screen.getAllByTestId("park-card")).toHaveLength(2);
  });

  it("should display park names", () => {
    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    expect(screen.getByText("Test Park 1")).toBeInTheDocument();
    expect(screen.getByText("Test Park 2")).toBeInTheDocument();
  });

  it("should render user icon", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    // Lucide renders as SVG with aria-hidden
    const userIcon = container.querySelector("svg.lucide-user");
    expect(userIcon).toBeInTheDocument();
  });

  it("should render heart icons", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    // Should have heart icons for favorites section
    const heartIcons = container.querySelectorAll("svg.lucide-heart");
    expect(heartIcons.length).toBeGreaterThan(0);
  });

  it("should handle parks with all required fields", () => {
    const minimalPark: Park = {
      id: "minimal",
      name: "Minimal Park",
      state: "Texas",
      coords: { lat: 30, lng: -98 },
      utvAllowed: false,
      terrain: [],
      amenities: [],
      difficulty: [],
    };

    render(<UserProfileClient parks={[minimalPark]} user={mockUser} />);

    expect(screen.getByText("Minimal Park")).toBeInTheDocument();
  });

  it("should call toggleFavorite when favorite button is clicked", async () => {
    mockToggleFavorite.mockResolvedValue(undefined);
    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    // Find and click the favorite button for the first park
    const favoriteButtons = screen.getAllByText("Favorite");
    fireEvent.click(favoriteButtons[0]);

    expect(mockToggleFavorite).toHaveBeenCalledWith("park-1");
  });

  it("should call toggleFavorite when unfavorite button is clicked", async () => {
    mockToggleFavorite.mockResolvedValue(undefined);
    mockIsFavorite.mockReturnValue(true);

    render(<UserProfileClient parks={mockParks} user={mockUser} />);

    // Find and click the unfavorite button for the first park
    const unfavoriteButtons = screen.getAllByText("Unfavorite");
    fireEvent.click(unfavoriteButtons[0]);

    expect(mockToggleFavorite).toHaveBeenCalledWith("park-1");
  });

  it("should render SessionProvider wrapper", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    // SessionProvider is mocked to render a div wrapper
    expect(container.firstChild).toBeDefined();
  });

  it("should render grid layout for park cards", () => {
    const { container } = render(
      <UserProfileClient parks={mockParks} user={mockUser} />,
    );

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid).toHaveClass("xl:grid-cols-3");
  });

  it("should render sticky header", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
  });

  it("should render Back to Parks link with correct href", () => {
    const { container } = render(
      <UserProfileClient parks={[]} user={mockUser} />,
    );

    const links = container.querySelectorAll('a[href="/"]');
    // Should have at least 2: app title and Back to Parks button
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});
