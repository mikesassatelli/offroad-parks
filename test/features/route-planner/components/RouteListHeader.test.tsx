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
    render(<RouteListHeader onClearRoute={vi.fn()} />);
    expect(screen.getByText("Route Planner")).toBeInTheDocument();
  });

  it("should render clear button", () => {
    render(<RouteListHeader onClearRoute={vi.fn()} />);
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });

  it("should call onClearRoute when clear button clicked", async () => {
    const onClearRoute = vi.fn();
    const user = userEvent.setup();

    render(<RouteListHeader onClearRoute={onClearRoute} />);

    await user.click(screen.getByRole("button", { name: /clear/i }));
    expect(onClearRoute).toHaveBeenCalledOnce();
  });

  it("should not display total distance when not provided", () => {
    render(<RouteListHeader onClearRoute={vi.fn()} />);
    expect(screen.queryByText(/total distance/i)).not.toBeInTheDocument();
  });

  it("should not display total distance when zero via legacy prop", () => {
    render(<RouteListHeader totalDistance={0} onClearRoute={vi.fn()} />);
    expect(screen.queryByText(/total distance/i)).not.toBeInTheDocument();
  });

  it("should display total distance when totalDistanceMi is provided", () => {
    render(<RouteListHeader totalDistanceMi={123} onClearRoute={vi.fn()} />);
    expect(screen.getByText(/total distance/i)).toBeInTheDocument();
    expect(screen.getByText(/123 mi/i)).toBeInTheDocument();
  });

  it("should display crow flies disclaimer when using legacy totalDistance prop", () => {
    render(<RouteListHeader totalDistance={50} onClearRoute={vi.fn()} />);
    expect(screen.getByText(/as the crow flies/i)).toBeInTheDocument();
  });

  it("should not show crow flies disclaimer when totalDistanceMi is set", () => {
    render(
      <RouteListHeader
        totalDistanceMi={50}
        estimatedDurationMin={60}
        onClearRoute={vi.fn()}
      />,
    );
    expect(screen.queryByText(/as the crow flies/i)).not.toBeInTheDocument();
  });

  it("should display drive duration when estimatedDurationMin is provided", () => {
    render(
      <RouteListHeader
        totalDistanceMi={200}
        estimatedDurationMin={180}
        onClearRoute={vi.fn()}
      />,
    );
    expect(screen.getByText(/3h/)).toBeInTheDocument();
    expect(screen.getByText(/drive/i)).toBeInTheDocument();
  });

  it("should show Calculating spinner when isRouting is true", () => {
    render(<RouteListHeader isRouting={true} onClearRoute={vi.fn()} />);
    expect(screen.getByText(/calculating/i)).toBeInTheDocument();
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

  it("should render trash icon in clear button", () => {
    const { container } = render(
      <RouteListHeader onClearRoute={vi.fn()} />,
    );

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });
});
