import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShareRouteDialog } from "@/features/route-planner/ShareRouteDialog";
import type { SavedRoute } from "@/lib/types";
import { vi } from "vitest";

const makeRoute = (overrides: Partial<SavedRoute> = {}): SavedRoute => ({
  id: "route-1",
  title: "Weekend Loop",
  description: null,
  shareToken: "share-abc",
  isPublic: false,
  waypoints: [
    { id: "w1", type: "park", label: "Park A", lat: 34, lng: -118 },
    { id: "w2", type: "park", label: "Park B", lat: 37, lng: -122 },
  ],
  routeGeometry: null,
  totalDistanceMi: 120,
  estimatedDurationMin: 180,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
  ...overrides,
});

describe("ShareRouteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders the share URL derived from origin + token", () => {
    const route = makeRoute({ isPublic: true });
    render(
      <ShareRouteDialog
        route={route}
        onOpenChange={() => {}}
        onToggleShare={async () => route}
      />,
    );

    const input = screen.getByLabelText(/share url/i) as HTMLInputElement;
    expect(input.value).toMatch(/\/routes\/share\/share-abc$/);
  });

  it("calls onToggleShare with true when the toggle is turned on", async () => {
    const route = makeRoute({ isPublic: false });
    const onToggleShare = vi.fn().mockResolvedValue({
      ...route,
      isPublic: true,
    });

    render(
      <ShareRouteDialog
        route={route}
        onOpenChange={() => {}}
        onToggleShare={onToggleShare}
      />,
    );

    const toggle = screen.getByRole("switch", { name: /allow sharing/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggleShare).toHaveBeenCalledWith(route, true);
    });
  });

  it("calls onToggleShare with false when the toggle is turned off", async () => {
    const route = makeRoute({ isPublic: true });
    const onToggleShare = vi.fn().mockResolvedValue({
      ...route,
      isPublic: false,
    });

    render(
      <ShareRouteDialog
        route={route}
        onOpenChange={() => {}}
        onToggleShare={onToggleShare}
      />,
    );

    const toggle = screen.getByRole("switch", { name: /allow sharing/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(onToggleShare).toHaveBeenCalledWith(route, false);
    });
  });

  it("copies the share URL to the clipboard when Copy link is clicked", async () => {
    const route = makeRoute({ isPublic: true });
    render(
      <ShareRouteDialog
        route={route}
        onOpenChange={() => {}}
        onToggleShare={async () => route}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringMatching(/\/routes\/share\/share-abc$/),
      );
    });

    expect(await screen.findByText(/copied!/i)).toBeInTheDocument();
  });

  it("disables copy when sharing is off", () => {
    const route = makeRoute({ isPublic: false });
    render(
      <ShareRouteDialog
        route={route}
        onOpenChange={() => {}}
        onToggleShare={async () => route}
      />,
    );

    const copyBtn = screen.getByRole("button", { name: /copy link/i });
    expect(copyBtn).toBeDisabled();
  });
});
