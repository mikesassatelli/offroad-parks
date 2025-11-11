import { fireEvent, render, screen } from "@testing-library/react";
import { UserMenu } from "@/components/layout/UserMenu";
import { vi } from "vitest";

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className, asChild }: any) => (
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children, align, className }: any) => (
    <div
      data-testid="dropdown-content"
      data-align={align}
      className={className}
    >
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, asChild, className }: any) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuSeparator: () => <div data-testid="dropdown-separator" />,
}));

describe("UserMenu", () => {
  const mockOnSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const regularUser = {
    name: "John Doe",
    email: "john@example.com",
    image: null,
    role: "USER",
  };

  const adminUser = {
    name: "Admin User",
    email: "admin@example.com",
    image: null,
    role: "ADMIN",
  };

  it("should render dropdown menu", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument();
  });

  it("should display user name in trigger button", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    const names = screen.getAllByText("John Doe");
    expect(names).toHaveLength(2); // Once in button, once in dropdown content
  });

  it('should display "Account" when user has no name', () => {
    const userWithoutName = { ...regularUser, name: null };
    render(<UserMenu user={userWithoutName} onSignOut={mockOnSignOut} />);

    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("should display user email in dropdown content", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("should render My Favorites link", () => {
    const { container } = render(
      <UserMenu user={regularUser} onSignOut={mockOnSignOut} />,
    );

    const favoritesLink = container.querySelector('a[href="/profile"]');
    expect(favoritesLink).toBeInTheDocument();
    expect(screen.getByText("My Favorites")).toBeInTheDocument();
  });

  it("should render Submit Park link", () => {
    const { container } = render(
      <UserMenu user={regularUser} onSignOut={mockOnSignOut} />,
    );

    const submitLink = container.querySelector('a[href="/submit"]');
    expect(submitLink).toBeInTheDocument();
    expect(screen.getByText("Submit Park")).toBeInTheDocument();
  });

  it("should render Sign Out option", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("should call onSignOut when Sign Out is clicked", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    const signOutItem = screen
      .getAllByTestId("dropdown-item")
      .find((item) => item.textContent?.includes("Sign Out"));

    fireEvent.click(signOutItem!);
    expect(mockOnSignOut).toHaveBeenCalled();
  });

  it("should not show Admin Panel for regular users", () => {
    render(<UserMenu user={regularUser} onSignOut={mockOnSignOut} />);

    expect(screen.queryByText("Admin Panel")).not.toBeInTheDocument();
  });

  it("should show Admin Panel for admin users", () => {
    render(<UserMenu user={adminUser} onSignOut={mockOnSignOut} />);

    expect(screen.getByText("Admin Panel")).toBeInTheDocument();
  });

  it("should render Admin Panel link for admin users", () => {
    const { container } = render(
      <UserMenu user={adminUser} onSignOut={mockOnSignOut} />,
    );

    const adminLink = container.querySelector('a[href="/admin"]');
    expect(adminLink).toBeInTheDocument();
  });

  it("should have extra separator before Admin Panel", () => {
    render(<UserMenu user={adminUser} onSignOut={mockOnSignOut} />);

    const separators = screen.getAllByTestId("dropdown-separator");
    // Should have 3 separators for admin: after user info, before admin panel, after admin panel
    expect(separators.length).toBeGreaterThanOrEqual(3);
  });

  it("should render user icons", () => {
    const { container } = render(
      <UserMenu user={regularUser} onSignOut={mockOnSignOut} />,
    );

    // Lucide renders as SVG with aria-hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should handle user with undefined image", () => {
    const userWithUndefinedImage = { ...regularUser, image: undefined };
    render(
      <UserMenu user={userWithUndefinedImage} onSignOut={mockOnSignOut} />,
    );

    const names = screen.getAllByText("John Doe");
    expect(names).toHaveLength(2); // Should still render correctly
  });
});
