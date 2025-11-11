import { render, screen } from "@testing-library/react";
import { RouteListEmpty } from "@/features/route-planner/components/RouteListEmpty";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

describe("RouteListEmpty", () => {
  it("should render route planner title", () => {
    render(<RouteListEmpty />);

    expect(screen.getByText("Route Planner")).toBeInTheDocument();
  });

  it("should display empty state message", () => {
    render(<RouteListEmpty />);

    expect(
      screen.getByText(/Add to Route.*park markers.*build your trip/),
    ).toBeInTheDocument();
  });

  it("should have h-full class on card", () => {
    const { container } = render(<RouteListEmpty />);

    const card = container.querySelector(".h-full");
    expect(card).toBeInTheDocument();
  });
});
