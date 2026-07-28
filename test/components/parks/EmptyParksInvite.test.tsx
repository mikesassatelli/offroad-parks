import { render, screen } from "@testing-library/react";
import { EmptyParksInvite } from "@/components/parks/EmptyParksInvite";

describe("EmptyParksInvite", () => {
  it("keeps the plain 'no matches' line", () => {
    render(<EmptyParksInvite />);

    expect(
      screen.getByText(/no parks match your filters/i),
    ).toBeInTheDocument();
  });

  it("invites the user to add a missing park", () => {
    render(<EmptyParksInvite />);

    expect(
      screen.getByText(/know an offroad park or trail system that isn/i),
    ).toBeInTheDocument();
  });

  it("renders a Submit button linking to /submit", () => {
    render(<EmptyParksInvite />);

    const link = screen.getByRole("link", { name: /submit a park/i });
    expect(link).toHaveAttribute("href", "/submit");
  });
});
