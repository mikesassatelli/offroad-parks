import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublicSharedRoute } from "@/features/route-planner/share/PublicSharedRoute";
import type { SavedRoute } from "@/lib/types";
import { vi } from "vitest";

const pushMock = vi.fn();
const signInMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useSession: () => ({ data: null, status: "unauthenticated" }),
  signIn: (...args: unknown[]) => signInMock(...args),
  signOut: vi.fn(),
}));

// Skip the leaflet-heavy map in this unit test.
vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = (_: unknown) => null;
    Stub.displayName = "MapStub";
    return Stub;
  },
}));

const makeRoute = (overrides: Partial<SavedRoute> = {}): SavedRoute => ({
  id: "route-1",
  title: "Weekend Loop",
  description: "A scenic ride",
  shareToken: "share-abc",
  isPublic: true,
  waypoints: [
    { id: "w1", type: "park", label: "Park A", lat: 34, lng: -118 },
    { id: "w2", type: "custom", label: "Gas stop", lat: 36, lng: -120 },
  ],
  routeGeometry: null,
  totalDistanceMi: 120,
  estimatedDurationMin: 180,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
  ...overrides,
});

describe("PublicSharedRoute", () => {
  beforeEach(() => {
    pushMock.mockClear();
    signInMock.mockClear();
    global.fetch = vi.fn();
  });

  it("renders the read-only title, description, distance, and waypoints", () => {
    render(
      <PublicSharedRoute
        route={makeRoute()}
        user={null}
        shareUrl="https://example.com/routes/share/share-abc"
      />,
    );

    expect(screen.getByText("Weekend Loop")).toBeInTheDocument();
    expect(screen.getByText("A scenic ride")).toBeInTheDocument();
    expect(screen.getByText(/2 stops/)).toBeInTheDocument();
    expect(screen.getByText(/120 mi/)).toBeInTheDocument();
    expect(screen.getByText("Park A")).toBeInTheDocument();
    expect(screen.getByText("Gas stop")).toBeInTheDocument();
  });

  it("shows a sign-in CTA for logged-out visitors", () => {
    render(
      <PublicSharedRoute
        route={makeRoute()}
        user={null}
        shareUrl="https://example.com/routes/share/share-abc"
      />,
    );

    const btn = screen.getByTestId("signin-to-save-button");
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(signInMock).toHaveBeenCalledWith(undefined, {
      callbackUrl: "https://example.com/routes/share/share-abc",
    });
  });

  it("POSTs a copy and navigates to /routes for logged-in visitors", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "copied-route" }),
    });

    render(
      <PublicSharedRoute
        route={makeRoute()}
        user={{ name: "Alice", email: "a@example.com", image: null, role: null }}
        shareUrl="https://example.com/routes/share/share-abc"
      />,
    );

    fireEvent.click(screen.getByTestId("save-copy-button"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/routes",
        expect.objectContaining({ method: "POST" }),
      );
    });

    const body = JSON.parse(
      (global.fetch as any).mock.calls[0][1].body as string,
    );
    expect(body.title).toMatch(/^Copy of /);
    expect(body.isPublic).toBe(false);
    expect(body.waypoints).toHaveLength(2);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/routes");
    });
  });
});
