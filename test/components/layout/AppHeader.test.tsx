import { fireEvent, render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { signIn, signOut } from "next-auth/react";
import { vi } from "vitest";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange?.("price")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock("@/components/layout/UserMenu", () => ({
  UserMenu: ({ user, onSignOut }: any) => (
    <div data-testid="user-menu">
      <span>{user.name}</span>
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  ),
}));

describe("AppHeader", () => {
  const mockOnSortChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the app title", () => {
    render(<AppHeader sortOption="name" onSortChange={mockOnSortChange} />);

    expect(screen.getByText(/UTV Parks/)).toBeInTheDocument();
  });

  it("should display beta badge", () => {
    render(<AppHeader sortOption="name" onSortChange={mockOnSortChange} />);

    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("should render sort dropdown", () => {
    render(<AppHeader sortOption="name" onSortChange={mockOnSortChange} />);

    expect(screen.getByTestId("select")).toBeInTheDocument();
  });

  it("should display current sort option", () => {
    render(<AppHeader sortOption="price" onSortChange={mockOnSortChange} />);

    const select = screen.getByTestId("select");
    expect(select).toHaveAttribute("data-value", "price");
  });

  it("should show sign in button when user is not authenticated", () => {
    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={null}
      />,
    );

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should call signIn when sign in button is clicked", () => {
    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={null}
      />,
    );

    const signInButton = screen.getByText("Sign In");
    fireEvent.click(signInButton);

    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("should show UserMenu when user is authenticated", () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      image: null,
      role: "USER",
    };

    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={user}
      />,
    );

    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should not show sign in button when user is authenticated", () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
    };

    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={user}
      />,
    );

    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("should call signOut when sign out is clicked in UserMenu", async () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
    };

    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={user}
      />,
    );

    const signOutButton = screen.getByText("Sign Out");
    fireEvent.click(signOutButton);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("should render filter icon", () => {
    const { container } = render(
      <AppHeader sortOption="name" onSortChange={mockOnSortChange} />,
    );

    // Lucide renders as SVG with aria-hidden
    const filterIcon = container.querySelector('svg[aria-hidden="true"]');
    expect(filterIcon).toBeInTheDocument();
  });

  it("should pass user with admin role", () => {
    const adminUser = {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
    };

    render(
      <AppHeader
        sortOption="name"
        onSortChange={mockOnSortChange}
        user={adminUser}
      />,
    );

    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("should call onSortChange when sort option changes", () => {
    render(<AppHeader sortOption="name" onSortChange={mockOnSortChange} />);

    const select = screen.getByTestId("select");
    fireEvent.click(select);

    expect(mockOnSortChange).toHaveBeenCalledWith("price");
  });

  it("should render sort options in select", () => {
    render(<AppHeader sortOption="name" onSortChange={mockOnSortChange} />);

    // Verify the sort option SelectItems are rendered
    expect(screen.getByText("Name (A–Z)")).toBeInTheDocument();
    expect(screen.getByText("Lowest Day Pass")).toBeInTheDocument();
    expect(screen.getByText("Most Trail Miles")).toBeInTheDocument();
  });

  it("should have sticky header positioning", () => {
    const { container } = render(
      <AppHeader sortOption="name" onSortChange={mockOnSortChange} />,
    );

    const header = container.querySelector("header");
    expect(header).toHaveClass("sticky");
    expect(header).toHaveClass("top-0");
    expect(header).toHaveClass("backdrop-blur-sm");
  });
});
