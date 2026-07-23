import { render, screen, fireEvent, within } from "@testing-library/react";
import { vi } from "vitest";
import { AdminNav } from "@/components/admin/AdminNav";

let mockPathname = "/admin/dashboard";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

describe("AdminNav", () => {
  beforeEach(() => {
    mockPathname = "/admin/dashboard";
  });

  it("renders the core nav items", () => {
    render(<AdminNav isSuperAdmin={false} />);
    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ai research/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^parks$/i })).toBeInTheDocument();
  });

  it("hides Pre-grants from non-super-admins", () => {
    render(<AdminNav isSuperAdmin={false} />);
    expect(
      screen.queryByRole("link", { name: /pre-grants/i })
    ).not.toBeInTheDocument();
  });

  it("shows Pre-grants to super admins", () => {
    render(<AdminNav isSuperAdmin={true} />);
    expect(
      screen.getByRole("link", { name: /pre-grants/i })
    ).toBeInTheDocument();
  });

  it("marks AI Research active on its sub-routes (most-specific match)", () => {
    mockPathname = "/admin/ai-research/discovery";
    render(<AdminNav isSuperAdmin={false} />);
    expect(screen.getByRole("link", { name: /ai research/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
    // Parks is not active while under the AI Research section.
    expect(
      screen.getByRole("link", { name: /^parks$/i })
    ).not.toHaveAttribute("aria-current");
  });

  it("marks Parks active on its sub-routes (Add Park is a button, not a nav item)", () => {
    mockPathname = "/admin/parks/new";
    render(<AdminNav isSuperAdmin={false} />);
    expect(
      screen.queryByRole("link", { name: /add park/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^parks$/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("opens and closes the mobile drawer", () => {
    render(<AdminNav isSuperAdmin={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i })
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Drawer contains its own nav links.
    expect(
      within(dialog).getByRole("link", { name: /dashboard/i })
    ).toBeInTheDocument();

    fireEvent.click(
      within(dialog).getByRole("button", { name: /close navigation menu/i })
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the drawer when a nav link is clicked", () => {
    render(<AdminNav isSuperAdmin={false} />);
    fireEvent.click(
      screen.getByRole("button", { name: /open navigation menu/i })
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("link", { name: /photos/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
