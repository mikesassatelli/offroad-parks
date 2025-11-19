import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteList } from "@/features/route-planner/RouteList";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock child components
vi.mock("@/features/route-planner/components/RouteListEmpty", () => ({
  RouteListEmpty: () => <div data-testid="route-list-empty">Empty State</div>,
}));

vi.mock("@/features/route-planner/components/RouteListHeader", () => ({
  RouteListHeader: ({ totalDistance, onClearRoute }: any) => (
    <div data-testid="route-list-header">
      <button onClick={onClearRoute}>Clear</button>
      {totalDistance > 0 && <span>Distance: {totalDistance} mi</span>}
    </div>
  ),
}));

vi.mock("@/features/route-planner/components/RouteListItem", () => ({
  RouteListItem: ({
    park,
    index,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragLeave,
    onRemovePark,
  }: any) => (
    <div
      data-testid={`route-item-${index}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDragLeave={onDragLeave}
      className={`${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}`}
    >
      {park.name}
      <button onClick={() => onRemovePark(park.id)}>Remove {park.name}</button>
    </div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("RouteList", () => {
  const mockParks: Park[] = [
    {
      id: "park-1",
      name: "Park One",
      state: "California",
      coords: { lat: 34.0522, lng: -118.2437 },
      terrain: [],
      amenities: [],
      
    camping: [],difficulty: [],
    vehicleTypes: [],
    },
    {
      id: "park-2",
      name: "Park Two",
      state: "Nevada",
      coords: { lat: 36.1699, lng: -115.1398 },
      terrain: [],
      amenities: [],
      
    camping: [],difficulty: [],
    vehicleTypes: [],
    },
    {
      id: "park-3",
      name: "Park Three",
      state: "Arizona",
      coords: { lat: 33.4484, lng: -112.074 },
      terrain: [],
      amenities: [],
      
    camping: [],difficulty: [],
    vehicleTypes: [],
    },
  ];

  const defaultProps = {
    routeParks: mockParks,
    onRemovePark: vi.fn(),
    onClearRoute: vi.fn(),
    onReorderRoute: vi.fn(),
    totalDistance: 250,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no parks", () => {
    render(<RouteList {...defaultProps} routeParks={[]} />);

    expect(screen.getByTestId("route-list-empty")).toBeInTheDocument();
  });

  it("should render route list header when parks exist", () => {
    render(<RouteList {...defaultProps} />);

    expect(screen.getByTestId("route-list-header")).toBeInTheDocument();
  });

  it("should render all route items", () => {
    render(<RouteList {...defaultProps} />);

    expect(screen.getByTestId("route-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("route-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("route-item-2")).toBeInTheDocument();
  });

  it("should display park names", () => {
    render(<RouteList {...defaultProps} />);

    expect(screen.getByText("Park One")).toBeInTheDocument();
    expect(screen.getByText("Park Two")).toBeInTheDocument();
    expect(screen.getByText("Park Three")).toBeInTheDocument();
  });

  it("should call onClearRoute when clear button clicked", async () => {
    const onClearRoute = vi.fn();
    const user = userEvent.setup();

    render(<RouteList {...defaultProps} onClearRoute={onClearRoute} />);

    await user.click(screen.getByText("Clear"));

    expect(onClearRoute).toHaveBeenCalledOnce();
  });

  it("should call onRemovePark when remove button clicked", async () => {
    const onRemovePark = vi.fn();
    const user = userEvent.setup();

    render(<RouteList {...defaultProps} onRemovePark={onRemovePark} />);

    await user.click(screen.getByText("Remove Park One"));

    expect(onRemovePark).toHaveBeenCalledWith("park-1");
  });

  it("should pass total distance to header", () => {
    render(<RouteList {...defaultProps} totalDistance={123} />);

    expect(screen.getByText("Distance: 123 mi")).toBeInTheDocument();
  });

  it("should handle drag and drop reordering", () => {
    const onReorderRoute = vi.fn();

    render(<RouteList {...defaultProps} onReorderRoute={onReorderRoute} />);

    const firstItem = screen.getByTestId("route-item-0");
    const secondItem = screen.getByTestId("route-item-1");

    // Start dragging first item
    fireEvent.dragStart(firstItem);

    // Drag over second item
    fireEvent.dragOver(secondItem);

    // End drag
    fireEvent.dragEnd(firstItem);

    expect(onReorderRoute).toHaveBeenCalledWith(0, 1);
  });

  it("should not call onReorderRoute when dropped on same position", () => {
    const onReorderRoute = vi.fn();

    render(<RouteList {...defaultProps} onReorderRoute={onReorderRoute} />);

    const firstItem = screen.getByTestId("route-item-0");

    // Start dragging first item
    fireEvent.dragStart(firstItem);

    // Drag over same item
    fireEvent.dragOver(firstItem);

    // End drag
    fireEvent.dragEnd(firstItem);

    expect(onReorderRoute).not.toHaveBeenCalled();
  });

  it("should handle drag leave", () => {
    render(<RouteList {...defaultProps} />);

    const firstItem = screen.getByTestId("route-item-0");
    const secondItem = screen.getByTestId("route-item-1");

    // Start dragging
    fireEvent.dragStart(firstItem);

    // Drag over second item
    fireEvent.dragOver(secondItem);

    // Leave second item
    fireEvent.dragLeave(secondItem);

    // Drag should still end without error
    fireEvent.dragEnd(firstItem);
  });

  it("should handle single park in route", () => {
    const singlePark = [mockParks[0]];

    render(<RouteList {...defaultProps} routeParks={singlePark} />);

    expect(screen.getByTestId("route-item-0")).toBeInTheDocument();
    expect(screen.queryByTestId("route-item-1")).not.toBeInTheDocument();
  });

  it("should render with zero distance", () => {
    render(<RouteList {...defaultProps} totalDistance={0} />);

    expect(screen.getByTestId("route-list-header")).toBeInTheDocument();
    expect(screen.queryByText(/distance/i)).not.toBeInTheDocument();
  });

  it("should handle removing all parks", async () => {
    const onRemovePark = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <RouteList {...defaultProps} onRemovePark={onRemovePark} />,
    );

    // Remove all parks
    await user.click(screen.getByText("Remove Park One"));
    await user.click(screen.getByText("Remove Park Two"));
    await user.click(screen.getByText("Remove Park Three"));

    // Simulate parent updating routeParks to empty
    rerender(
      <RouteList
        {...defaultProps}
        routeParks={[]}
        onRemovePark={onRemovePark}
      />,
    );

    expect(screen.getByTestId("route-list-empty")).toBeInTheDocument();
  });

  it("should maintain park order when rendering", () => {
    render(<RouteList {...defaultProps} />);

    expect(screen.getByTestId("route-item-0")).toHaveTextContent("Park One");
    expect(screen.getByTestId("route-item-1")).toHaveTextContent("Park Two");
    expect(screen.getByTestId("route-item-2")).toHaveTextContent("Park Three");
  });

  it("should handle drag and drop from end to beginning", () => {
    const onReorderRoute = vi.fn();

    render(<RouteList {...defaultProps} onReorderRoute={onReorderRoute} />);

    const firstItem = screen.getByTestId("route-item-0");
    const thirdItem = screen.getByTestId("route-item-2");

    // Start dragging third item
    fireEvent.dragStart(thirdItem);

    // Drag over first item
    fireEvent.dragOver(firstItem);

    // End drag
    fireEvent.dragEnd(thirdItem);

    expect(onReorderRoute).toHaveBeenCalledWith(2, 0);
  });

  it("should render card container", () => {
    const { container } = render(<RouteList {...defaultProps} />);

    const card = container.querySelector(".h-full");
    expect(card).toBeInTheDocument();
  });
});
