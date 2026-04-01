import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteList } from "@/features/route-planner/RouteList";
import type { RouteWaypoint } from "@/lib/types";
import { vi } from "vitest";
import { useSession } from "next-auth/react";

// Mock next-auth session
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
}));

// Mock geocodeLocation so we don't make real HTTP calls
vi.mock("@/features/map/utils/routing", () => ({
  geocodeLocation: vi.fn(() => Promise.resolve(null)),
}));

// Mock child components
vi.mock("@/features/route-planner/components/RouteListEmpty", () => ({
  RouteListEmpty: () => <div data-testid="route-list-empty">Empty State</div>,
}));

vi.mock("@/features/route-planner/components/RouteListHeader", () => ({
  RouteListHeader: ({ totalDistanceMi, onClearRoute }: any) => (
    <div data-testid="route-list-header">
      <button onClick={onClearRoute}>Clear</button>
      {totalDistanceMi != null && totalDistanceMi > 0 && (
        <span>Distance: {totalDistanceMi} mi</span>
      )}
    </div>
  ),
}));

vi.mock("@/features/route-planner/components/RouteListItem", () => ({
  RouteListItem: ({
    waypoint,
    index,
    isDragging,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDragLeave,
    onRemove,
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
      {waypoint.label}
      <button onClick={() => onRemove(waypoint.id)}>
        Remove {waypoint.label}
      </button>
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

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, disabled, type, ...props }: any) => (
    <button
      onClick={onClick}
      className={className}
      disabled={disabled}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("RouteList", () => {
  const mockWaypoints: RouteWaypoint[] = [
    {
      id: "wp-1",
      type: "park",
      label: "Park One",
      parkId: "park-1",
      parkSlug: "park-one",
      lat: 34.0522,
      lng: -118.2437,
    },
    {
      id: "wp-2",
      type: "park",
      label: "Park Two",
      parkId: "park-2",
      parkSlug: "park-two",
      lat: 36.1699,
      lng: -115.1398,
    },
    {
      id: "wp-3",
      type: "park",
      label: "Park Three",
      parkId: "park-3",
      parkSlug: "park-three",
      lat: 33.4484,
      lng: -112.074,
    },
  ];

  const defaultProps = {
    waypoints: mockWaypoints,
    onRemoveWaypoint: vi.fn(),
    onClearRoute: vi.fn(),
    onReorderRoute: vi.fn(),
    onAddCustomWaypoint: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render empty state when no waypoints", () => {
    render(<RouteList {...defaultProps} waypoints={[]} />);
    expect(screen.getByTestId("route-list-empty")).toBeInTheDocument();
  });

  it("should render route list header when waypoints exist", () => {
    render(<RouteList {...defaultProps} />);
    expect(screen.getByTestId("route-list-header")).toBeInTheDocument();
  });

  it("should render all route items", () => {
    render(<RouteList {...defaultProps} />);
    expect(screen.getByTestId("route-item-0")).toBeInTheDocument();
    expect(screen.getByTestId("route-item-1")).toBeInTheDocument();
    expect(screen.getByTestId("route-item-2")).toBeInTheDocument();
  });

  it("should display waypoint labels", () => {
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

  it("should call onRemoveWaypoint when remove button clicked", async () => {
    const onRemoveWaypoint = vi.fn();
    const user = userEvent.setup();

    render(
      <RouteList {...defaultProps} onRemoveWaypoint={onRemoveWaypoint} />,
    );

    await user.click(screen.getByText("Remove Park One"));

    expect(onRemoveWaypoint).toHaveBeenCalledWith("wp-1");
  });

  it("should pass routeResult distance to header", () => {
    render(
      <RouteList
        {...defaultProps}
        routeResult={{ distanceMi: 123, durationMin: 60, geometry: { type: "LineString", coordinates: [] } }}
      />,
    );

    expect(screen.getByText("Distance: 123 mi")).toBeInTheDocument();
  });

  it("should handle drag and drop reordering", () => {
    const onReorderRoute = vi.fn();

    render(<RouteList {...defaultProps} onReorderRoute={onReorderRoute} />);

    const firstItem = screen.getByTestId("route-item-0");
    const secondItem = screen.getByTestId("route-item-1");

    fireEvent.dragStart(firstItem);
    fireEvent.dragOver(secondItem);
    fireEvent.dragEnd(firstItem);

    expect(onReorderRoute).toHaveBeenCalledWith(0, 1);
  });

  it("should not call onReorderRoute when dropped on same position", () => {
    const onReorderRoute = vi.fn();

    render(<RouteList {...defaultProps} onReorderRoute={onReorderRoute} />);

    const firstItem = screen.getByTestId("route-item-0");

    fireEvent.dragStart(firstItem);
    fireEvent.dragOver(firstItem);
    fireEvent.dragEnd(firstItem);

    expect(onReorderRoute).not.toHaveBeenCalled();
  });

  it("should handle single waypoint in route", () => {
    render(<RouteList {...defaultProps} waypoints={[mockWaypoints[0]]} />);
    expect(screen.getByTestId("route-item-0")).toBeInTheDocument();
    expect(screen.queryByTestId("route-item-1")).not.toBeInTheDocument();
  });

  it("should render with zero route result distance", () => {
    render(<RouteList {...defaultProps} routeResult={null} />);
    expect(screen.getByTestId("route-list-header")).toBeInTheDocument();
  });

  it("should handle removing all waypoints via rerender", async () => {
    const onRemoveWaypoint = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <RouteList {...defaultProps} onRemoveWaypoint={onRemoveWaypoint} />,
    );

    await user.click(screen.getByText("Remove Park One"));
    await user.click(screen.getByText("Remove Park Two"));
    await user.click(screen.getByText("Remove Park Three"));

    rerender(
      <RouteList
        {...defaultProps}
        waypoints={[]}
        onRemoveWaypoint={onRemoveWaypoint}
      />,
    );

    expect(screen.getByTestId("route-list-empty")).toBeInTheDocument();
  });

  it("should maintain waypoint order when rendering", () => {
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

    fireEvent.dragStart(thirdItem);
    fireEvent.dragOver(firstItem);
    fireEvent.dragEnd(thirdItem);

    expect(onReorderRoute).toHaveBeenCalledWith(2, 0);
  });

  it("should render card container", () => {
    const { container } = render(<RouteList {...defaultProps} />);
    const card = container.querySelector(".h-full");
    expect(card).toBeInTheDocument();
  });

  it("should show Add Custom Stop button", () => {
    render(<RouteList {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /add custom stop/i }),
    ).toBeInTheDocument();
  });

  it("should show search input when Add Custom Stop is clicked", async () => {
    const user = userEvent.setup();
    render(<RouteList {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /add custom stop/i }));

    expect(
      screen.getByPlaceholderText(/search a location/i),
    ).toBeInTheDocument();
  });

  it("should cancel custom stop search and return to Add Custom Stop button", async () => {
    const user = userEvent.setup();
    render(<RouteList {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /add custom stop/i }));
    expect(screen.getByPlaceholderText(/search a location/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByRole("button", { name: /add custom stop/i })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/search a location/i)).not.toBeInTheDocument();
  });

  it("should call onAddCustomWaypoint when geocode succeeds", async () => {
    const { geocodeLocation } = await import("@/features/map/utils/routing");
    vi.mocked(geocodeLocation).mockResolvedValueOnce({
      label: "Moab, UT",
      lat: 38.5733,
      lng: -109.5498,
    });

    const onAddCustomWaypoint = vi.fn();
    const user = userEvent.setup();

    render(<RouteList {...defaultProps} onAddCustomWaypoint={onAddCustomWaypoint} />);

    await user.click(screen.getByRole("button", { name: /add custom stop/i }));
    await user.type(screen.getByPlaceholderText(/search a location/i), "Moab");
    await user.click(screen.getByRole("button", { name: "" })); // submit search

    await screen.findByRole("button", { name: /add custom stop/i });

    expect(onAddCustomWaypoint).toHaveBeenCalledWith("Moab, UT", 38.5733, -109.5498);
  });

  it("should show no results error when geocode returns null", async () => {
    const { geocodeLocation } = await import("@/features/map/utils/routing");
    vi.mocked(geocodeLocation).mockResolvedValueOnce(null);

    const user = userEvent.setup();
    render(<RouteList {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: /add custom stop/i }));
    await user.type(screen.getByPlaceholderText(/search a location/i), "Nowhere");
    fireEvent.submit(screen.getByPlaceholderText(/search a location/i).closest("form")!);

    expect(await screen.findByText(/no results found/i)).toBeInTheDocument();
  });

  it("should show Save Route button when authenticated with 2+ waypoints and onSaveRoute", () => {
    vi.mocked(useSession).mockReturnValueOnce({ data: { user: { id: "user-1" } } as any, status: "authenticated", update: vi.fn() });

    const onSaveRoute = vi.fn().mockResolvedValue(null);

    render(
      <RouteList
        {...defaultProps}
        onSaveRoute={onSaveRoute}
      />,
    );

    expect(screen.getByRole("button", { name: /save route/i })).toBeInTheDocument();
  });

  it("should call onSaveRoute when Save Route is clicked with a title", async () => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "user-1" } } as any, status: "authenticated", update: vi.fn() });

    const onSaveRoute = vi.fn().mockResolvedValue(null);
    const user = userEvent.setup();

    render(
      <RouteList
        {...defaultProps}
        onSaveRoute={onSaveRoute}
      />,
    );

    await user.type(screen.getByPlaceholderText(/name your route/i), "Epic Desert Trip");
    await user.click(screen.getByRole("button", { name: /save route/i }));

    expect(onSaveRoute).toHaveBeenCalledWith("Epic Desert Trip", false);
  });

  it("should show Copy Share Link after route is saved", async () => {
    vi.mocked(useSession).mockReturnValue({ data: { user: { id: "user-1" } } as any, status: "authenticated", update: vi.fn() });

    const savedRoute = {
      id: "route-1", title: "Epic Trip", shareToken: "tok-abc",
      isPublic: false, waypoints: [], createdAt: "", updatedAt: "",
    };
    const onSaveRoute = vi.fn().mockResolvedValue(savedRoute);
    const user = userEvent.setup();

    render(
      <RouteList
        {...defaultProps}
        onSaveRoute={onSaveRoute}
      />,
    );

    await user.type(screen.getByPlaceholderText(/name your route/i), "Epic Desert Trip");
    await user.click(screen.getByRole("button", { name: /save route/i }));

    expect(await screen.findByRole("button", { name: /copy share link/i })).toBeInTheDocument();
  });
});
