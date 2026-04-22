import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MyRoutesOverlayPanel } from "@/features/route-planner/MyRoutesOverlayPanel";
import type { SavedRoute } from "@/lib/types";
import { vi } from "vitest";

const sampleRoute: SavedRoute = {
  id: "route-1",
  title: "Weekend Loop",
  description: null,
  shareToken: "t1",
  isPublic: false,
  waypoints: [
    { id: "w1", type: "park", label: "A", lat: 34, lng: -118 },
    { id: "w2", type: "park", label: "B", lat: 37, lng: -122 },
  ],
  routeGeometry: null,
  totalDistanceMi: 100,
  estimatedDurationMin: 120,
  createdAt: "2026-04-01T00:00:00Z",
  updatedAt: "2026-04-01T00:00:00Z",
};

describe("MyRoutesOverlayPanel", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([sampleRoute]),
    });
  });

  it("renders the panel header collapsed by default", () => {
    render(
      <MyRoutesOverlayPanel
        onSelectRoute={vi.fn()}
        selectedRouteId={null}
      />,
    );
    expect(screen.getByText("My Routes")).toBeInTheDocument();
    // Hidden by default (list not rendered)
    expect(screen.queryByTestId("my-routes-overlay-list")).not.toBeInTheDocument();
  });

  it("fetches and lists routes when opened, calls onSelectRoute on click", async () => {
    const onSelect = vi.fn();
    render(
      <MyRoutesOverlayPanel
        onSelectRoute={onSelect}
        selectedRouteId={null}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /show/i }));

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith("/api/routes"),
    );

    await waitFor(() =>
      expect(screen.getByText("Weekend Loop")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Weekend Loop"));
    expect(onSelect).toHaveBeenCalledWith(sampleRoute);
  });

  it("passes `null` when the selected route is clicked again (toggle off)", async () => {
    const onSelect = vi.fn();
    render(
      <MyRoutesOverlayPanel
        onSelectRoute={onSelect}
        selectedRouteId="route-1"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /show/i }));
    await waitFor(() =>
      expect(screen.getByText("Weekend Loop")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByText("Weekend Loop"));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
