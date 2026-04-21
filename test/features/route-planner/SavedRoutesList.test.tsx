import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SavedRoutesList } from "@/features/route-planner/SavedRoutesList";
import type { SavedRoute } from "@/lib/types";
import { vi } from "vitest";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

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

describe("SavedRoutesList", () => {
  beforeEach(() => {
    pushMock.mockClear();
    global.fetch = vi.fn();
  });

  it("renders an empty-state when no routes exist", () => {
    render(<SavedRoutesList initialRoutes={[]} />);
    expect(screen.getByText(/haven't saved any routes yet/i)).toBeInTheDocument();
  });

  it("renders each route's title, distance, and stop count", () => {
    const routes = [makeRoute(), makeRoute({ id: "route-2", title: "Desert Run" })];
    render(<SavedRoutesList initialRoutes={routes} />);

    expect(screen.getByText("Weekend Loop")).toBeInTheDocument();
    expect(screen.getByText("Desert Run")).toBeInTheDocument();
    expect(screen.getAllByText(/2 stops/).length).toBe(2);
    expect(screen.getAllByText(/120 mi/).length).toBe(2);
  });

  it("navigates to `/?routeId=…` when Open is clicked", () => {
    render(<SavedRoutesList initialRoutes={[makeRoute()]} />);

    fireEvent.click(screen.getByRole("button", { name: /open weekend loop/i }));
    expect(pushMock).toHaveBeenCalledWith("/?routeId=route-1");
  });

  it("confirms before deleting and calls DELETE on confirm", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<SavedRoutesList initialRoutes={[makeRoute()]} />);

    fireEvent.click(screen.getByRole("button", { name: /delete weekend loop/i }));

    // Confirmation dialog visible
    expect(await screen.findByText(/delete route\?/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

    // Confirm
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/routes/route-1",
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    // Row should be removed after successful delete
    await waitFor(() => {
      expect(screen.queryByText("Weekend Loop")).not.toBeInTheDocument();
    });
  });

  it("cancels delete without calling fetch", () => {
    render(<SavedRoutesList initialRoutes={[makeRoute()]} />);

    fireEvent.click(screen.getByRole("button", { name: /delete weekend loop/i }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(global.fetch).not.toHaveBeenCalled();
    // Route still present
    expect(screen.getByText("Weekend Loop")).toBeInTheDocument();
  });

  it("PATCHes with the new title when Rename is confirmed", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          ...makeRoute(),
          title: "New Name",
        }),
    });

    render(<SavedRoutesList initialRoutes={[makeRoute()]} />);

    fireEvent.click(screen.getByRole("button", { name: /rename weekend loop/i }));

    const input = await screen.findByLabelText(/route title/i);
    fireEvent.change(input, { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/routes/route-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ title: "New Name" }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText("New Name")).toBeInTheDocument();
    });
  });
});
