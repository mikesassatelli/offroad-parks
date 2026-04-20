import { render } from "@testing-library/react";
import { MapVisibilityHandler } from "@/features/map/components/MapVisibilityHandler";
import type { Park } from "@/lib/types";
import { beforeEach, vi } from "vitest";

// Mock react-leaflet's useMap to return a controllable stub.
const invalidateSize = vi.fn();
const setView = vi.fn();
const getContainer = vi.fn();

vi.mock("react-leaflet", () => ({
  useMap: () => ({
    invalidateSize,
    setView,
    getContainer,
  }),
}));

describe("MapVisibilityHandler", () => {
  const park: Park = {
    id: "park-1",
    name: "Test Park",
    address: { state: "CA" },
    coords: { lat: 34.0522, lng: -118.2437 },
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  beforeEach(() => {
    invalidateSize.mockReset();
    setView.mockReset();
    getContainer.mockReset();
  });

  it("should invalidate size and recenter on mount when a center is provided", () => {
    const container = document.createElement("div");
    getContainer.mockReturnValue(container);

    render(<MapVisibilityHandler center={park} zoom={10} />);

    expect(invalidateSize).toHaveBeenCalled();
    expect(setView).toHaveBeenCalledWith(
      [park.coords!.lat, park.coords!.lng],
      10,
      { animate: false },
    );
  });

  it("should default zoom to 8 when no zoom is provided", () => {
    const container = document.createElement("div");
    getContainer.mockReturnValue(container);

    render(<MapVisibilityHandler center={park} />);

    expect(setView).toHaveBeenCalledWith(
      [park.coords!.lat, park.coords!.lng],
      8,
      { animate: false },
    );
  });

  it("should still invalidate size when center has no coords (no recenter call)", () => {
    const container = document.createElement("div");
    getContainer.mockReturnValue(container);

    const noCoordPark: Park = { ...park, coords: undefined };
    render(<MapVisibilityHandler center={noCoordPark} />);

    expect(invalidateSize).toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });

  it("should be a no-op when useMap returns no container", () => {
    getContainer.mockReturnValue(null);

    render(<MapVisibilityHandler center={park} />);

    expect(invalidateSize).not.toHaveBeenCalled();
    expect(setView).not.toHaveBeenCalled();
  });

  it("should still run the initial recenter when ResizeObserver is unavailable", () => {
    const container = document.createElement("div");
    getContainer.mockReturnValue(container);

    const originalRO = globalThis.ResizeObserver;
    // Simulate an environment without ResizeObserver (older browsers, some
    // JSDOM configurations). The handler should still perform its initial
    // size invalidation + setView and then bail out cleanly.
    // @ts-expect-error - intentionally removing to cover the guard branch.
    delete globalThis.ResizeObserver;

    render(<MapVisibilityHandler center={park} zoom={7} />);

    expect(invalidateSize).toHaveBeenCalledTimes(1);
    expect(setView).toHaveBeenCalledTimes(1);
    expect(setView).toHaveBeenCalledWith(
      [park.coords!.lat, park.coords!.lng],
      7,
      { animate: false },
    );

    globalThis.ResizeObserver = originalRO;
  });

  it("should recenter again when the ResizeObserver fires", () => {
    const container = document.createElement("div");
    getContainer.mockReturnValue(container);

    // Capture the observer callback so we can invoke it manually.
    let observerCallback: ResizeObserverCallback = () => {};
    class MockResizeObserver {
      constructor(cb: ResizeObserverCallback) {
        observerCallback = cb;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }
    const originalRO = globalThis.ResizeObserver;
    globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

    render(<MapVisibilityHandler center={park} zoom={9} />);

    // Initial mount call.
    expect(setView).toHaveBeenCalledTimes(1);

    // Simulate the container resizing (tab pane becoming visible / laying out).
    observerCallback([], {} as ResizeObserver);

    expect(setView).toHaveBeenCalledTimes(2);
    expect(setView).toHaveBeenLastCalledWith(
      [park.coords!.lat, park.coords!.lng],
      9,
      { animate: false },
    );

    globalThis.ResizeObserver = originalRO;
  });
});
