import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoModerationTable } from "@/components/admin/PhotoModerationTable";
import { vi } from "vitest";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, fill, className }: any) => (
    <img src={src} alt={alt} className={className} data-fill={fill} />
  ),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// Mock Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("PhotoModerationTable", () => {
  const mockPhotos = [
    {
      id: "photo-1",
      url: "https://example.com/photo1.jpg",
      caption: "Beautiful sunset view",
      status: "PENDING",
      createdAt: new Date("2024-01-15"),
      park: {
        name: "Test Park One",
        slug: "test-park-one",
      },
      user: {
        name: "John Doe",
        email: "john@example.com",
      },
    },
    {
      id: "photo-2",
      url: "https://example.com/photo2.jpg",
      caption: null,
      status: "APPROVED",
      createdAt: new Date("2024-02-20"),
      park: {
        name: "Test Park Two",
        slug: "test-park-two",
      },
      user: null,
    },
    {
      id: "photo-3",
      url: "https://example.com/photo3.jpg",
      caption: "Rocky terrain",
      status: "REJECTED",
      createdAt: new Date("2024-03-10"),
      park: {
        name: "Test Park Three",
        slug: "test-park-three",
      },
      user: {
        name: "Jane Smith",
        email: "jane@example.com",
      },
    },
  ];

  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    mockConfirm = vi.fn(() => true);

    global.fetch = mockFetch;
    global.alert = mockAlert;
    global.confirm = mockConfirm;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render all photos by default", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.getByText("Test Park Two")).toBeInTheDocument();
    expect(screen.getByText("Test Park Three")).toBeInTheDocument();
  });

  it("should render empty state when no photos", () => {
    render(<PhotoModerationTable photos={[]} />);

    expect(screen.getByText("No photos found")).toBeInTheDocument();
  });

  it("should render photo images", () => {
    const { container } = render(<PhotoModerationTable photos={mockPhotos} />);

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(3);
    expect(images[0]).toHaveAttribute("src", "https://example.com/photo1.jpg");
  });

  it("should render photo captions when provided", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    expect(screen.getByText("Beautiful sunset view")).toBeInTheDocument();
    expect(screen.getByText("Rocky terrain")).toBeInTheDocument();
  });

  it("should render park links", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    const link = screen.getByRole("link", { name: /test park one/i });
    expect(link).toHaveAttribute("href", "/parks/test-park-one");
  });

  it("should render uploader name", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    expect(screen.getByText(/uploaded by: john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/uploaded by: jane smith/i)).toBeInTheDocument();
  });

  it("should render Unknown when no uploader", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    expect(screen.getByText(/uploaded by: unknown/i)).toBeInTheDocument();
  });

  it("should render formatted dates", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    expect(
      screen.getByText(new Date("2024-01-15").toLocaleDateString()),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2024-02-20").toLocaleDateString()),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2024-03-10").toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it("should render status badges", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    const statusBadges = screen.getAllByText(/PENDING|APPROVED|REJECTED/);
    expect(statusBadges.length).toBeGreaterThan(0);
  });

  it("should render grid layout", () => {
    const { container } = render(<PhotoModerationTable photos={mockPhotos} />);

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("lg:grid-cols-3");
  });

  it("should render icons", () => {
    const { container } = render(<PhotoModerationTable photos={mockPhotos} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should render approve and reject buttons for pending photo", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Get all buttons with Approve in the name
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    // Should be at least one approve action button (filter tab + action button)
    expect(approveButtons.length).toBeGreaterThan(1);

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    expect(rejectButtons.length).toBeGreaterThan(1);
  });

  it("should approve photo when approve button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Get the action button (not the filter tab)
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    const approveButton = approveButtons.find((btn) =>
      btn.className.includes("flex-1"),
    );

    await user.click(approveButton!);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/photos/photo-1/approve",
      {
        method: "POST",
      },
    );

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should reject photo when reject button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/photos/photo-1/reject", {
      method: "POST",
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should show alert when approve fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Get the action button (not the filter tab)
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    const approveButton = approveButtons.find((btn) =>
      btn.className.includes("flex-1"),
    );

    await user.click(approveButton!);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve photo");
    });
  });

  it("should show alert when reject fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject photo");
    });
  });

  it("should handle network error on approve", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Get the action button (not the filter tab)
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    const approveButton = approveButtons.find((btn) =>
      btn.className.includes("flex-1"),
    );

    await user.click(approveButton!);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve photo");
    });
  });

  it("should disable buttons while processing", async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)),
    );
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Get the action buttons (not the filter tabs)
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    const approveButton = approveButtons.find((btn) =>
      btn.className.includes("flex-1"),
    )!;

    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    const rejectButton = rejectButtons.find((btn) =>
      btn.className.includes("flex-1"),
    )!;

    await user.click(approveButton);

    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it("should filter photos by PENDING status", async () => {
    const user = userEvent.setup();
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Click PENDING filter tab
    const pendingTab = screen.getByRole("button", { name: /PENDING/ });
    await user.click(pendingTab);

    // Only pending photo should be visible
    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.queryByText("Test Park Two")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Park Three")).not.toBeInTheDocument();
  });

  it("should filter photos by APPROVED status", async () => {
    const user = userEvent.setup();
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Click APPROVED filter tab
    const approvedTab = screen.getByRole("button", { name: /APPROVED/ });
    await user.click(approvedTab);

    // Only approved photo should be visible
    expect(screen.queryByText("Test Park One")).not.toBeInTheDocument();
    expect(screen.getByText("Test Park Two")).toBeInTheDocument();
    expect(screen.queryByText("Test Park Three")).not.toBeInTheDocument();
  });

  it("should filter photos by REJECTED status", async () => {
    const user = userEvent.setup();
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Click REJECTED filter tab
    const rejectedTab = screen.getByRole("button", { name: /REJECTED/ });
    await user.click(rejectedTab);

    // Only rejected photo should be visible
    expect(screen.queryByText("Test Park One")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Park Two")).not.toBeInTheDocument();
    expect(screen.getByText("Test Park Three")).toBeInTheDocument();
  });

  it("should show all photos when ALL filter is selected", async () => {
    const user = userEvent.setup();
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Click PENDING first to change filter
    await user.click(screen.getByRole("button", { name: /PENDING/ }));

    // Then click ALL to show all photos
    await user.click(screen.getByRole("button", { name: "ALL" }));

    // All photos should be visible
    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.getByText("Test Park Two")).toBeInTheDocument();
    expect(screen.getByText("Test Park Three")).toBeInTheDocument();
  });

  it('should show "No photos found" when filter has no matches', async () => {
    const user = userEvent.setup();
    const photosWithoutRejected = mockPhotos.filter(
      (p) => p.status !== "REJECTED",
    );
    render(<PhotoModerationTable photos={photosWithoutRejected} />);

    // Click REJECTED filter tab
    await user.click(screen.getByRole("button", { name: /REJECTED/ }));

    expect(screen.getByText("No photos found")).toBeInTheDocument();
  });

  it("should delete photo when confirmed", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Find the delete button for approved photo
    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (btn) =>
        btn.textContent?.includes("Delete") &&
        !btn.textContent?.includes("Reject"),
    );

    await user.click(deleteButton!);

    expect(mockConfirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this photo?",
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/photos/photo-2", {
      method: "DELETE",
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should not delete photo when not confirmed", async () => {
    mockConfirm.mockReturnValue(false);
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Find the delete button for approved photo
    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (btn) =>
        btn.textContent?.includes("Delete") &&
        !btn.textContent?.includes("Reject"),
    );

    await user.click(deleteButton!);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("should show alert when delete fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Find the delete button for approved photo
    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (btn) =>
        btn.textContent?.includes("Delete") &&
        !btn.textContent?.includes("Reject"),
    );

    await user.click(deleteButton!);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete photo");
    });
  });

  it("should handle network error on delete", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    // Find the delete button for approved photo
    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find(
      (btn) =>
        btn.textContent?.includes("Delete") &&
        !btn.textContent?.includes("Reject"),
    );

    await user.click(deleteButton!);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete photo");
    });
  });

  it("should render approve button for rejected photos", () => {
    const rejectedPhoto = mockPhotos.find((p) => p.status === "REJECTED")!;
    render(<PhotoModerationTable photos={[rejectedPhoto]} />);

    // Rejected photos should have approve and delete buttons
    const buttons = screen.getAllByRole("button");
    const approveButton = buttons.find((btn) =>
      btn.textContent?.includes("Approve"),
    );
    expect(approveButton).toBeInTheDocument();
  });

  it("should render delete button for approved photos", () => {
    const approvedPhoto = mockPhotos.find((p) => p.status === "APPROVED")!;
    render(<PhotoModerationTable photos={[approvedPhoto]} />);

    // Approved photos should have delete button
    const deleteButton = screen.getByRole("button", { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it("should handle photo without caption", () => {
    render(<PhotoModerationTable photos={mockPhotos} />);

    // Photo 2 has no caption, so it shouldn't render caption text
    const photos = mockPhotos.filter((p) => p.caption === null);
    expect(photos.length).toBeGreaterThan(0);
  });

  it("should handle network error on reject", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<PhotoModerationTable photos={mockPhotos} />);

    await user.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject photo");
    });
  });

  it("should approve rejected photo when approve button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    const rejectedPhoto = mockPhotos.find((p) => p.status === "REJECTED")!;
    render(<PhotoModerationTable photos={[rejectedPhoto]} />);

    // Get the approve action button (not the filter tab) - it has flex-1 class
    const buttons = screen.getAllByRole("button");
    const approveButton = buttons.find(
      (btn) =>
        btn.textContent?.includes("Approve") &&
        btn.className.includes("flex-1"),
    );

    await user.click(approveButton!);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/admin/photos/photo-3/approve",
      {
        method: "POST",
      },
    );

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should delete rejected photo when delete button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    const rejectedPhoto = mockPhotos.find((p) => p.status === "REJECTED")!;
    render(<PhotoModerationTable photos={[rejectedPhoto]} />);

    // Get the delete button (the one without "Approve" text)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(
      (btn) =>
        btn.querySelector("svg") && !btn.textContent?.includes("Approve"),
    );

    await user.click(deleteButton!);

    expect(mockConfirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this photo?",
    );
    expect(mockFetch).toHaveBeenCalledWith("/api/photos/photo-3", {
      method: "DELETE",
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("should handle unknown status with default styling", () => {
    const photoWithUnknownStatus = {
      ...mockPhotos[0],
      status: "UNKNOWN_STATUS",
    };

    const { container } = render(
      <PhotoModerationTable photos={[photoWithUnknownStatus]} />,
    );

    // Find the status badge
    const statusBadge = screen.getByText("UNKNOWN_STATUS");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge.className).toContain("bg-gray-100");
    expect(statusBadge.className).toContain("text-gray-800");
  });
});
