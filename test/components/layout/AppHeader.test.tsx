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

vi.mock("@/components/layout/UserMenu", () => ({
  UserMenu: ({ user, onSignOut }: any) => (
    <div data-testid="user-menu">
      <span>{user.name}</span>
      <button onClick={onSignOut}>Sign Out</button>
    </div>
  ),
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the app title", () => {
    render(<AppHeader />);

    expect(screen.getByText(/UTV Parks/)).toBeInTheDocument();
  });

  it("should display beta badge", () => {
    render(<AppHeader />);

    expect(screen.getByText("beta")).toBeInTheDocument();
  });

  it("should render Park Reviews nav link", () => {
    render(<AppHeader />);

    expect(screen.getByText("Park Reviews")).toBeInTheDocument();
  });

  it("should render Submit Park nav link", () => {
    render(<AppHeader />);

    expect(screen.getByText("Submit Park")).toBeInTheDocument();
  });

  it("should show sign in button when user is not authenticated", () => {
    render(<AppHeader user={null} />);

    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("should call signIn when sign in button is clicked", () => {
    render(<AppHeader user={null} />);

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

    render(<AppHeader user={user} />);

    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
  });

  it("should not show sign in button when user is authenticated", () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
    };

    render(<AppHeader user={user} />);

    expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
  });

  it("should call signOut when sign out is clicked in UserMenu", async () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
    };

    render(<AppHeader user={user} />);

    const signOutButton = screen.getByText("Sign Out");
    fireEvent.click(signOutButton);

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });

  it("should show My Profile link when user is authenticated", () => {
    const user = {
      name: "John Doe",
      email: "john@example.com",
      role: "USER",
    };

    render(<AppHeader user={user} />);

    expect(screen.getByText("My Profile")).toBeInTheDocument();
  });

  it("should not show My Profile link when user is not authenticated", () => {
    render(<AppHeader user={null} />);

    expect(screen.queryByText("My Profile")).not.toBeInTheDocument();
  });

  it("should pass user with admin role", () => {
    const adminUser = {
      name: "Admin User",
      email: "admin@example.com",
      role: "ADMIN",
    };

    render(<AppHeader user={adminUser} />);

    expect(screen.getByText("Admin User")).toBeInTheDocument();
  });

  it("should render icons for nav links", () => {
    const { container } = render(<AppHeader />);

    // Lucide renders as SVG with aria-hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should not show back button by default", () => {
    render(<AppHeader />);

    expect(screen.queryByText("Back to Parks")).not.toBeInTheDocument();
  });

  it("should show back button when showBackButton is true", () => {
    render(<AppHeader showBackButton />);

    expect(screen.getByText("Back to Parks")).toBeInTheDocument();
  });

  it("should render back button with correct link", () => {
    const { container } = render(<AppHeader showBackButton />);

    const backLink = container.querySelector('a[href="/"]');
    expect(backLink).toBeInTheDocument();
    expect(backLink?.textContent).toContain("Back to Parks");
  });
});
