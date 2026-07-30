import { fireEvent, render, screen } from "@testing-library/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { signOut } from "next-auth/react";
import { vi } from "vitest";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Local next/navigation mock exposing a stable push spy (the global setup mock
// returns a fresh push each call, which can't be asserted on).
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
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

// The sign-in UI (Google + email magic-link) is exercised in
// LoginDialog.test.tsx; here we just assert the header renders it.
vi.mock("@/components/auth/LoginDialog", () => ({
  LoginDialog: () => <button>Sign In</button>,
}));

describe("AppHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("should render the app title", () => {
    render(<AppHeader />);

    expect(screen.getByText(/Offroad Parks/)).toBeInTheDocument();
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

    // Two responsive entry points render for signed-out users: the desktop
    // header dialog and the mobile bottom-bar tab (each hidden at the other's
    // breakpoint via CSS). Assert at least one is present.
    expect(screen.getAllByText("Sign In").length).toBeGreaterThan(0);
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

  it("Back to Parks restores the stored browse view (filters + view)", () => {
    window.sessionStorage.setItem(
      "parks:returnUrl",
      "/?state=Arkansas&view=map",
    );

    const { container } = render(<AppHeader showBackButton />);
    fireEvent.click(
      container.querySelector('a[aria-label="Back to Parks"]') as HTMLElement,
    );

    expect(mockPush).toHaveBeenCalledWith("/?state=Arkansas&view=map");

    window.sessionStorage.clear();
  });

  it("Back to Parks falls back to the bare list when nothing is stored", () => {
    window.sessionStorage.removeItem("parks:returnUrl");

    const { container } = render(<AppHeader showBackButton />);
    fireEvent.click(
      container.querySelector('a[aria-label="Back to Parks"]') as HTMLElement,
    );

    // No stored view → the plain href="/" navigation is used, not router.push.
    expect(mockPush).not.toHaveBeenCalled();
  });
});
