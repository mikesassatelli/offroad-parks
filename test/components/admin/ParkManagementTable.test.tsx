import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParkManagementTable } from "@/components/admin/ParkManagementTable";
import { vi } from "vitest";

describe("ParkManagementTable", () => {
  const mockParks = [
    {
      id: "park-1",
      name: "Test Park One",
      slug: "test-park-one",
      city: "Los Angeles",
      state: "California",
      status: "PENDING" as const,
      createdAt: new Date("2024-01-15"),
      submitterName: "John Doe",
      submittedBy: {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
      },
      terrain: [{ terrain: "sand" }],
      difficulty: [{ difficulty: "moderate" }],
      amenities: [{ amenity: "camping" }],
    },
    {
      id: "park-2",
      name: "Test Park Two",
      slug: "test-park-two",
      city: null,
      state: "Nevada",
      status: "APPROVED" as const,
      createdAt: new Date("2024-02-20"),
      submitterName: null,
      submittedBy: null,
      terrain: [],
      difficulty: [],
      amenities: [],
    },
    {
      id: "park-3",
      name: "Test Park Three",
      slug: "test-park-three",
      city: "Phoenix",
      state: "Arizona",
      status: "REJECTED" as const,
      createdAt: new Date("2024-03-10"),
      submitterName: "Jane Smith",
      submittedBy: {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
      },
      terrain: [],
      difficulty: [],
      amenities: [],
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

    global.fetch = mockFetch;
    global.alert = mockAlert;
    global.confirm = mockConfirm;

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

  it("should render table headers", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("Park")).toBeInTheDocument();
    expect(screen.getByText("Location")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Submitted By")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("should render all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("Test Park One")).toBeInTheDocument();
    expect(screen.getByText("Test Park Two")).toBeInTheDocument();
    expect(screen.getByText("Test Park Three")).toBeInTheDocument();
  });

  it("should render park slug below name", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("test-park-one")).toBeInTheDocument();
    expect(screen.getByText("test-park-two")).toBeInTheDocument();
  });

  it("should render location with city and state", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("Los Angeles, California")).toBeInTheDocument();
    expect(screen.getByText("Phoenix, Arizona")).toBeInTheDocument();
  });

  it("should render location without city when not provided", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("Nevada")).toBeInTheDocument();
  });

  it("should render status badges", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("PENDING")).toBeInTheDocument();
    expect(screen.getByText("APPROVED")).toBeInTheDocument();
    expect(screen.getByText("REJECTED")).toBeInTheDocument();
  });

  it("should render submitter name", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
  });

  it("should render submitter email", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
  });

  it("should render Anonymous when no submitter info", () => {
    render(<ParkManagementTable parks={mockParks} />);

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("should render formatted dates", () => {
    render(<ParkManagementTable parks={mockParks} />);

    // Dates are formatted with toLocaleDateString()
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

  it("should render approve and reject buttons for pending parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    // Only pending park should have approve/reject buttons
    const approveButtons = screen.getAllByTitle("Approve");
    const rejectButtons = screen.getAllByTitle("Reject");

    expect(approveButtons).toHaveLength(1);
    expect(rejectButtons).toHaveLength(1);
  });

  it("should render edit link for all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    const editLinks = screen.getAllByTitle("Edit");
    expect(editLinks).toHaveLength(3);
    expect(editLinks[0]).toHaveAttribute("href", "/admin/parks/park-1/edit");
  });

  it("should render delete button for all parks", () => {
    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = screen.getAllByTitle("Delete");
    expect(deleteButtons).toHaveLength(3);
  });

  it("should highlight park when highlightId matches", () => {
    const { container } = render(
      <ParkManagementTable parks={mockParks} highlightId="park-2" />,
    );

    const rows = container.querySelectorAll("tbody tr");
    expect(rows[1]).toHaveClass("bg-blue-50");
  });

  it("should approve park when approve button clicked", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(screen.getByTitle("Approve"));

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

    await user.click(screen.getByTitle("Reject"));

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

    await user.click(screen.getByTitle("Approve"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve park");
    });

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should show alert when reject fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(screen.getByTitle("Reject"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject park");
    });

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should handle approve network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(screen.getByTitle("Approve"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve park");
    });
  });

  it("should handle reject network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    await user.click(screen.getByTitle("Reject"));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to reject park");
    });
  });

  it("should delete park when confirmed", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = screen.getAllByTitle("Delete");
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

    const deleteButtons = screen.getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it("should show alert when delete fails", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mockConfirm.mockReturnValue(true);
    const user = userEvent.setup();

    render(<ParkManagementTable parks={mockParks} />);

    const deleteButtons = screen.getAllByTitle("Delete");
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

    const approveButton = screen.getByTitle("Approve");
    const rejectButton = screen.getByTitle("Reject");

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
      expect(row).toHaveClass("hover:bg-gray-50");
    });
  });

  it("should render DRAFT status badge", () => {
    const draftPark = {
      ...mockParks[0],
      id: "park-draft",
      status: "DRAFT" as const,
    };

    render(<ParkManagementTable parks={[draftPark]} />);

    expect(screen.getByText("DRAFT")).toBeInTheDocument();
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

    const deleteButtons = screen.getAllByTitle("Delete");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to delete park");
    });
  });
});
