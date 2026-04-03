import { render, screen } from "@testing-library/react";
import { CustomWaypointMarker } from "@/features/map/components/CustomWaypointMarker";
import type { RouteWaypoint } from "@/lib/types";
import { vi } from "vitest";

vi.mock("react-leaflet", () => ({
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

vi.mock("@/features/map/utils/markers", () => ({
  createCustomWaypointIcon: vi.fn(() => ({})),
}));

describe("CustomWaypointMarker", () => {
  const waypoint: RouteWaypoint = {
    id: "wp-custom",
    type: "custom",
    label: "Fuel Stop",
    lat: 34.0,
    lng: -118.0,
    icon: "⛽",
  };

  it("should render marker with label", () => {
    render(<CustomWaypointMarker waypoint={waypoint} index={0} />);
    expect(screen.getByText("Fuel Stop")).toBeInTheDocument();
  });

  it("should show 1-based index in badge", () => {
    render(<CustomWaypointMarker waypoint={waypoint} index={2} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should show Custom stop label", () => {
    render(<CustomWaypointMarker waypoint={waypoint} index={0} />);
    expect(screen.getByText("Custom stop")).toBeInTheDocument();
  });

  it("should render Remove button when onRemove is provided", () => {
    const onRemove = vi.fn();
    render(<CustomWaypointMarker waypoint={waypoint} index={0} onRemove={onRemove} />);
    expect(screen.getByText("Remove from route")).toBeInTheDocument();
  });

  it("should not render Remove button when onRemove is not provided", () => {
    render(<CustomWaypointMarker waypoint={waypoint} index={0} />);
    expect(screen.queryByText("Remove from route")).not.toBeInTheDocument();
  });

  it("should call onRemove with waypoint id on mousedown", () => {
    const onRemove = vi.fn();
    const { getByText } = render(
      <CustomWaypointMarker waypoint={waypoint} index={0} onRemove={onRemove} />,
    );
    const btn = getByText("Remove from route");
    btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(onRemove).toHaveBeenCalledWith("wp-custom");
  });
});
