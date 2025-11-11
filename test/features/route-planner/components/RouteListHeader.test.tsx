import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteListHeader } from "@/features/route-planner/components/RouteListHeader";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  CardHeader: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
}));

describe("RouteListHeader", () => {
  it("should render route planner title", () => {
    render(<RouteListHeader totalDistance={0} onClearRoute={vi.fn()} />);

    expect(screen.getByText("Route Planner")).toBeInTheDocument();
  });

  it("should render clear button", () => {
    render(<RouteListHeader totalDistance={0} onClearRoute={vi.fn()} />);

    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("should call onClearRoute when clear button clicked", async () => {
    const onClearRoute = vi.fn();
    const user = userEvent.setup();

    render(<RouteListHeader totalDistance={0} onClearRoute={onClearRoute} />);

    await user.click(screen.getByRole("button", { name: /clear/i }));

    expect(onClearRoute).toHaveBeenCalledOnce();
  });

  it("should not display total distance when zero", () => {
    render(<RouteListHeader totalDistance={0} onClearRoute={vi.fn()} />);

    expect(screen.queryByText(/total distance/i)).not.toBeInTheDocument();
  });

  it("should display total distance when greater than zero", () => {
    render(<RouteListHeader totalDistance={123} onClearRoute={vi.fn()} />);

    expect(screen.getByText(/total distance/i)).toBeInTheDocument();
    expect(screen.getByText(/123 mi/i)).toBeInTheDocument();
  });

  it("should display crow flies disclaimer with distance", () => {
    render(<RouteListHeader totalDistance={50} onClearRoute={vi.fn()} />);

    expect(screen.getByText(/as the crow flies/i)).toBeInTheDocument();
  });

  it("should render trash icon in clear button", () => {
    const { container } = render(
      <RouteListHeader totalDistance={0} onClearRoute={vi.fn()} />,
    );

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should handle multiple clicks on clear button", async () => {
    const onClearRoute = vi.fn();
    const user = userEvent.setup();

    render(<RouteListHeader totalDistance={100} onClearRoute={onClearRoute} />);

    const clearButton = screen.getByRole("button", { name: /clear/i });
    await user.click(clearButton);
    await user.click(clearButton);
    await user.click(clearButton);

    expect(onClearRoute).toHaveBeenCalledTimes(3);
  });

  it("should display distance as integer", () => {
    render(<RouteListHeader totalDistance={42} onClearRoute={vi.fn()} />);

    expect(screen.getByText(/42 mi/i)).toBeInTheDocument();
  });

  it("should handle large distances", () => {
    render(<RouteListHeader totalDistance={9999} onClearRoute={vi.fn()} />);

    expect(screen.getByText(/9999 mi/i)).toBeInTheDocument();
  });
});
