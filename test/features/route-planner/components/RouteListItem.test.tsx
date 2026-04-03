import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteListItem } from "@/features/route-planner/components/RouteListItem";
import type { RouteWaypoint } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("RouteListItem", () => {
  const mockParkWaypoint: RouteWaypoint = {
    id: "wp-1",
    type: "park",
    label: "Test Park",
    parkId: "park-1",
    parkSlug: "test-park",
    lat: 34.0522,
    lng: -118.2437,
  };

  const mockCustomWaypoint: RouteWaypoint = {
    id: "wp-custom",
    type: "custom",
    label: "My Custom Stop",
    lat: 34.0,
    lng: -118.0,
  };

  const defaultProps = {
    waypoint: mockParkWaypoint,
    index: 0,
    isDragging: false,
    isDragOver: false,
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDragEnd: vi.fn(),
    onDragLeave: vi.fn(),
    onRemove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render park waypoint label", () => {
    render(<RouteListItem {...defaultProps} />);
    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should render custom waypoint label", () => {
    render(<RouteListItem {...defaultProps} waypoint={mockCustomWaypoint} />);
    expect(screen.getByText("My Custom Stop")).toBeInTheDocument();
  });

  it("should display route index number (1-based)", () => {
    render(<RouteListItem {...defaultProps} index={0} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should display correct index for second item", () => {
    render(<RouteListItem {...defaultProps} index={1} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should link to park detail page for park waypoints", () => {
    render(<RouteListItem {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/parks/test-park");
  });

  it("should not render a link for custom waypoints", () => {
    render(<RouteListItem {...defaultProps} waypoint={mockCustomWaypoint} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should call onRemove with waypoint id when remove button clicked", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(<RouteListItem {...defaultProps} onRemove={onRemove} />);

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalledWith("wp-1");
  });

  it("should call onRemove with custom waypoint id", async () => {
    const onRemove = vi.fn();
    const user = userEvent.setup();

    render(
      <RouteListItem
        {...defaultProps}
        waypoint={mockCustomWaypoint}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: /remove/i }));

    expect(onRemove).toHaveBeenCalledWith("wp-custom");
  });

  it("should call onDragStart when drag starts", () => {
    const onDragStart = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} index={2} onDragStart={onDragStart} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragStart(draggable);

    expect(onDragStart).toHaveBeenCalledWith(2);
  });

  it("should call onDragEnd when drag ends", () => {
    const onDragEnd = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} onDragEnd={onDragEnd} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragEnd(draggable);

    expect(onDragEnd).toHaveBeenCalled();
  });

  it("should call onDragLeave when drag leaves", () => {
    const onDragLeave = vi.fn();

    const { container } = render(
      <RouteListItem {...defaultProps} onDragLeave={onDragLeave} />,
    );

    const draggable = container.firstChild as HTMLElement;
    fireEvent.dragLeave(draggable);

    expect(onDragLeave).toHaveBeenCalled();
  });

  it("should apply dragging opacity when isDragging is true", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragging={true} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).toContain("opacity-50");
  });

  it("should apply drag over border when isDragOver is true", () => {
    const { container } = render(
      <RouteListItem {...defaultProps} isDragOver={true} />,
    );

    const draggable = container.firstChild as HTMLElement;
    expect(draggable.className).toContain("border-primary");
  });

  it("should be draggable", () => {
    const { container } = render(<RouteListItem {...defaultProps} />);

    const draggable = container.firstChild as HTMLElement;
    expect(draggable).toHaveAttribute("draggable", "true");
  });

  it("should render grip icon", () => {
    const { container } = render(<RouteListItem {...defaultProps} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });
});
