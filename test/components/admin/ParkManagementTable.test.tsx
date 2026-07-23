import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParkManagementTable } from "@/components/admin/ParkManagementTable";
import { vi } from "vitest";

// The table renders twice (desktop table + mobile card list); jsdom applies no
// CSS so both are present. Scope content/action assertions to the desktop table.
const inTable = () => within(screen.getByRole("table"));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("ParkManagementTable", () => {
  const mockParks = [
    {
      id: "park-1",
      name: "Test Park One",
      slug: "test-park-one",
      status: "PENDING" as const,
      createdAt: new Date("2024-01-15"),
      submitterName: "John Doe",
      submittedBy: {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
      },
      terrain: [{ terrain: "sand" }],
      amenities: [{ amenity: "restrooms" }],
      address: {
        city: "Los Angeles",
        state: "California",
      },
      camping: [], vehicleTypes: [],
      photos: [],
    },
    {
      id: "park-2",
      name: "Test Park Two",
      slug: "test-park-two",
      status: "APPROVED" as const,
      createdAt: new Date("2024-02-20"),
      submitterName: null,
      submittedBy: null,
      terrain: [],
      amenities: [],
      address: {
        city: null,
        state: "Nevada",
      },
      camping: [], vehicleTypes: [],
      photos: [],
    },
    {
      id: "park-3",
      name: "Test Park Three",
      slug: "test-park-three",
      status: "REJECTED" as const,
      createdAt: new Date("2024-03-10"),
      submitterName: "Jane Smith",
      submittedBy: {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
      },
      terrain: [],
      amenities: [],
      address: {
        city: "Phoenix",
        state: "Arizona",
      },
      camping: [], vehicleTypes: [],
      photos: [],
    },
  ];

  let mockReload: ReturnType<typeof vi.fn>;
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReload = vi.fn();
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    mockConfirm = vi.fn(() => true);

    Object.defineProperty(window, "location", {
      writable: true,
      value: { reload: mockReload },
    });

    global.fetch = mockFetch as any;
    global.alert = mockAlert as any;
    global.confirm = mockConfirm as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render empty state when no parks", () => {
    render(<ParkManagementTable parks={[]} />);

    expect(screen.getByText("No parks found")).toBeInTheDocument();
    expect(
      screen.getByText("No parks match the current filter criteria."),
    ).toBeInTheDocument();
  });

  it("pushes a server-side search query to the URL when typing", async () => {
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name, city, or state...",
    );
    await user.type(searchInput, "zzznomatch");
    expect(searchInput).toHaveValue("zzznomatch");

    // Search is server-driven now — typing debounces a navigation rather than
    // filtering the current page's rows in place.
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/parks?search=zzznomatch");
    });
  });

  it("preserves the active status filter in the search URL", async () => {
    const user = userEvent.setup();

    render(
      <ParkManagementTable parks={mockParks} statusFilter="pending" />,
    );

    await user.type(
      screen.getByPlaceholderText("Search by name, city, or state..."),
      "dunes",
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        "/admin/parks?status=pending&search=dunes",
      );
    });
  });

  it("should render table headers", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("Park")).toBeInTheDocument();
    expect(inTable().getByText("Location")).toBeInTheDocument();
    expect(inTable().getByText("Status")).toBeInTheDocument();
    expect(inTable().getByText("Submitted By")).toBeInTheDocument();
    expect(inTable().getByText("Date")).toBeInTheDocument();
    expect(inTable().getByText("Actions")).toBeInTheDocument();
  });

  it("should render all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("Test Park One")).toBeInTheDocument();
    expect(inTable().getByText("Test Park Two")).toBeInTheDocument();
    expect(inTable().getByText("Test Park Three")).toBeInTheDocument();
  });

  it("should render park slug below name", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("test-park-one")).toBeInTheDocument();
    expect(inTable().getByText("test-park-two")).toBeInTheDocument();
  });

  it("should render location with city and state", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("Los Angeles, California")).toBeInTheDocument();
    expect(inTable().getByText("Phoenix, Arizona")).toBeInTheDocument();
  });

  it("should render location without city when not provided", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("Nevada")).toBeInTheDocument();
  });

  it("should render status badges", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("PENDING")).toBeInTheDocument();
    expect(inTable().getByText("APPROVED")).toBeInTheDocument();
    expect(inTable().getByText("REJECTED")).toBeInTheDocument();
  });

  it("should render submitter name", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("John Doe")).toBeInTheDocument();
    expect(inTable().getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should render submitter email", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("john@example.com")).toBeInTheDocument();
    expect(inTable().getByText("jane@example.com")).toBeInTheDocument();
  });

  it("should render Anonymous when no submitter info", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(inTable().getByText("Anonymous")).toBeInTheDocument();
  });

  it("should render formatted dates", () => {
    render(<ParkManagementTable parks={mockParks} />);

    // Dates are formatted with toLocaleDateString()
    expect(
      inTable().getAllByText(new Date("2024-01-15").toLocaleDateString())[0],
    ).toBeInTheDocument();
    expect(
      inTable().getAllByText(new Date("2024-02-20").toLocaleDateString())[0],
    ).toBeInTheDocument();
    expect(
      inTable().getAllByText(new Date("2024-03-10").toLocaleDateString())[0],
    ).toBeInTheDocument();
  });

  it("should render approve and reject buttons for pending parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    // Only pending park should have approve/reject buttons
    expect(inTable().getAllByTitle("Approve")).toHaveLength(1);
    expect(inTable().getAllByTitle("Reject")).toHaveLength(1);
  });

  it("should render edit link for all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    const editLinks = inTable().getAllByTitle("Edit");
    expect(editLinks).toHaveLength(3);
    expect(editLinks[0]).toHaveAttribute("href", "/admin/parks/park-1/edit");
  });

  it("should render delete button for all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = inTable().getAllByTitle("Delete");
    expect(deleteButtons).toHaveLength(3);
  });

  it("should highlight park when highlightId matches", () => {
    const { container } = render(
      <ParkManagementTable parks={mockParks} highlightId="park-2" />,
    );

    const rows = container.querySelectorAll("tbody tr");
    expect(rows[1].className).toContain("bg-primary/10");
  });

  it("should approve park when approve button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Approve"));

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/parks/park-1/approve", {
      method: "POST",
    });

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("should reject park when reject button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Reject"));

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/parks/park-1/reject", {
      method: "POST",
    });

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("should show alert when approve fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Approve"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve park");
    });

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should show alert when reject fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Reject"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject park");
    });

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should handle approve network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Approve"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve park");
    });
  });

  it("should handle reject network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(inTable().getByTitle("Reject"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject park");
    });
  });

  it("should delete park when confirmed", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = inTable().getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete "Test Park One"? This action cannot be undone.',
    );

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/parks/park-1", {
      method: "DELETE",
    });

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("should not delete park when not confirmed", async () => {
    mockConfirm.mockReturnValue(false);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = inTable().getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should show alert when delete fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = inTable().getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete park");
    });
  });

  it("should disable buttons while processing", async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)),
    );
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const approveButton = inTable().getByTitle("Approve");
    const rejectButton = inTable().getByTitle("Reject");

    await user.click(approveButton);

    // Buttons should be disabled while processing
    expect(approveButton).toBeDisabled();
    expect(rejectButton).toBeDisabled();
  });

  it("should render icons", () => {
    const { container } = render(<ParkManagementTable parks={mockParks} />);

    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should apply hover styles to rows", () => {
    const { container } = render(<ParkManagementTable parks={mockParks} />);

    const rows = container.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      expect(row.className).toContain("hover:bg-accent/50");
    });
  });

  it("should show 'No photos' badge for approved park with no photos", () => {
    const approvedPark = { ...mockParks[1], photos: [] }; // park-2 is APPROVED
    render(<ParkManagementTable parks={[approvedPark]} />);
    expect(inTable().getByText("No photos")).toBeInTheDocument();
  });

  it("should not show 'No photos' badge for approved park with photos", () => {
    const approvedWithPhotos = { ...mockParks[1], photos: [{ id: "photo-1" }] };
    render(<ParkManagementTable parks={[approvedWithPhotos]} />);
    expect(screen.queryByText("No photos")).not.toBeInTheDocument();
  });

  it("should not show 'No photos' badge for pending park with no photos", () => {
    const pendingPark = { ...mockParks[0], photos: [] }; // park-1 is PENDING
    render(<ParkManagementTable parks={[pendingPark]} />);
    expect(screen.queryByText("No photos")).not.toBeInTheDocument();
  });

  it("should render DRAFT status badge", () => {
    const draftPark = {
      ...mockParks[0],
      id: "park-draft",
      status: "DRAFT" as const,
    };

    render(<ParkManagementTable parks={[draftPark]} />);

    expect(inTable().getByText("DRAFT")).toBeInTheDocument();
  });

  it("should not show approve/reject buttons for approved parks", () => {
    const approvedPark = mockParks.find((p) => p.status === "APPROVED")!;
    render(<ParkManagementTable parks={[approvedPark]} />);

    expect(screen.queryByTitle("Approve")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Reject")).not.toBeInTheDocument();
  });

  it("should not show approve/reject buttons for rejected parks", () => {
    const rejectedPark = mockParks.find((p) => p.status === "REJECTED")!;
    render(<ParkManagementTable parks={[rejectedPark]} />);

    expect(screen.queryByTitle("Approve")).not.toBeInTheDocument();
    expect(screen.queryByTitle("Reject")).not.toBeInTheDocument();
  });

  it("should handle delete network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = inTable().getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete park");
    });
  });
});
