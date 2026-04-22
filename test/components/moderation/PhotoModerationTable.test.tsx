import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import {
  PhotoModerationTable,
  type ModerationPhoto,
} from "@/components/moderation/PhotoModerationTable";

const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: any) => <img src={src} alt={alt} />,
}));

const makePendingPhoto = (
  overrides?: Partial<ModerationPhoto>,
): ModerationPhoto => ({
  id: "photo-1",
  parkId: "park-1",
  url: "https://example.com/photo.jpg",
  caption: "Nice view",
  status: "PENDING",
  createdAt: new Date(),
  park: { name: "Moab", slug: "moab" },
  user: { name: "Jane", email: "jane@example.com" },
  ...overrides,
});

describe("Shared PhotoModerationTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  it("uses the provided apiBase for approvals (operator-scoped API)", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);

    render(
      <PhotoModerationTable
        photos={[makePendingPhoto()]}
        apiBase="/api/operator/parks/moab/photos"
        allowGroupByPark={false}
      />,
    );

    const approveBtns = screen.getAllByRole("button", { name: /approve/i });
    // The last one is the action button inside the card; status filters come first
    fireEvent.click(approveBtns[approveBtns.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/operator/parks/moab/photos/photo-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "APPROVED" }),
        }),
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("uses the provided apiBase for rejections", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true } as Response);

    render(
      <PhotoModerationTable
        photos={[makePendingPhoto()]}
        apiBase="/api/admin/photos"
      />,
    );

    const rejectBtns = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectBtns[rejectBtns.length - 1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/photos/photo-1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "REJECTED" }),
        }),
      );
    });
  });

  it("hides the By Park toggle and park search when allowGroupByPark=false", () => {
    render(
      <PhotoModerationTable
        photos={[makePendingPhoto()]}
        apiBase="/api/operator/parks/moab/photos"
        allowGroupByPark={false}
      />,
    );

    expect(screen.queryByPlaceholderText(/search by park name/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^by park$/i })).not.toBeInTheDocument();
  });

  it("shows the By Park toggle by default for the admin use case", () => {
    render(
      <PhotoModerationTable
        photos={[makePendingPhoto()]}
        apiBase="/api/admin/photos"
      />,
    );

    expect(screen.getByPlaceholderText(/search by park name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^by park$/i })).toBeInTheDocument();
  });
});
