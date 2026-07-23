import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { FieldExtractionReview } from "@/components/admin/FieldExtractionReview";
import type { FieldExtractionSummary } from "@/lib/types";

const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

const makeExtraction = (
  overrides?: Partial<FieldExtractionSummary>
): FieldExtractionSummary => ({
  id: "ext-1",
  parkId: "park-1",
  parkName: "Moab Sand Flats",
  parkSlug: "moab-sand-flats",
  fieldName: "difficulty",
  extractedValue: JSON.stringify("moderate"),
  currentValue: JSON.stringify("easy"),
  confidence: "AI_EXTRACTED",
  confidenceScore: 0.85,
  status: "PENDING_REVIEW",
  sourcesChecked: 2,
  sourceUrl: "https://example.com/park",
  sourceTitle: "Example source",
  sourceQuote: "Trails are rated moderate for intermediate riders.",
  sessionId: "sess-1",
  createdAt: "2026-04-01T00:00:00Z",
  ...overrides,
});

describe("FieldExtractionReview", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    global.fetch = mockFetch as any;
    global.alert = mockAlert as any;
    vi.clearAllMocks();
  });

  it("renders extractions grouped by park with park name header", () => {
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);
    expect(screen.getByText("Moab Sand Flats")).toBeInTheDocument();
    expect(screen.getByText(/1 field$/i)).toBeInTheDocument();
  });

  it("uses plural 'fields' when more than one extraction exists per park", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction(),
          makeExtraction({ id: "ext-2", fieldName: "amenities" }),
        ]}
      />
    );
    expect(screen.getByText(/2 fields/i)).toBeInTheDocument();
  });

  it("renders multiple parks in separate groups", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction(),
          makeExtraction({
            id: "ext-2",
            parkId: "park-2",
            parkName: "Chadwick ATV",
          }),
        ]}
      />
    );
    expect(screen.getByText("Moab Sand Flats")).toBeInTheDocument();
    expect(screen.getByText("Chadwick ATV")).toBeInTheDocument();
  });

  it("renders source link when sourceUrl is present", () => {
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);
    const link = screen.getByRole("link", { name: /example source/i });
    expect(link).toHaveAttribute("href", "https://example.com/park");
  });

  it("omits source link when sourceUrl is null", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ sourceUrl: null, sourceTitle: null })]}
      />
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the source quote so admins can verify without opening the page", () => {
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);
    expect(
      screen.getByText(/Trails are rated moderate for intermediate riders\./i)
    ).toBeInTheDocument();
  });

  it("omits the quote block when sourceQuote is null", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ sourceQuote: null })]}
      />
    );
    expect(
      screen.queryByText(/intermediate riders/i)
    ).not.toBeInTheDocument();
  });

  it("formats boolean extracted values as Yes/No", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction({
            fieldName: "petsAllowed",
            extractedValue: JSON.stringify(true),
            currentValue: JSON.stringify(false),
          }),
        ]}
      />
    );
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("formats array values by joining with commas", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction({
            fieldName: "terrain",
            extractedValue: JSON.stringify(["sand", "rocks"]),
            currentValue: JSON.stringify([]),
          }),
        ]}
      />
    );
    expect(screen.getByText("sand, rocks")).toBeInTheDocument();
  });

  it("shows 'New values to add' label for array fields", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction({
            fieldName: "amenities",
            extractedValue: JSON.stringify(["parking"]),
          }),
        ]}
      />
    );
    expect(screen.getByText(/new values to add/i)).toBeInTheDocument();
  });

  it("shows 'Extracted Value' label for non-array fields", () => {
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);
    expect(screen.getByText(/extracted value/i)).toBeInTheDocument();
  });

  it("shows 'empty' label when currentValue is null", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ currentValue: null })]}
      />
    );
    expect(screen.getByText(/empty/i)).toBeInTheDocument();
  });

  it("shows 'null' label when extractedValue is null", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ extractedValue: null })]}
      />
    );
    expect(screen.getByText(/^null$/i)).toBeInTheDocument();
  });

  it("renders confidence badge with percentage for high score", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ confidenceScore: 0.92 })]}
      />
    );
    expect(screen.getByText("92%")).toBeInTheDocument();
  });

  it("renders confidence badge for medium score", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ confidenceScore: 0.55 })]}
      />
    );
    expect(screen.getByText("55%")).toBeInTheDocument();
  });

  it("renders confidence badge for low score", () => {
    render(
      <FieldExtractionReview
        extractions={[makeExtraction({ confidenceScore: 0.3 })]}
      />
    );
    expect(screen.getByText("30%")).toBeInTheDocument();
  });

  it("omits confidence badge when score is null", () => {
    const { container } = render(
      <FieldExtractionReview
        extractions={[makeExtraction({ confidenceScore: null })]}
      />
    );
    expect(container.textContent).not.toMatch(/%/);
  });

  it("falls back to raw JSON string when parsing fails", () => {
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction({
            extractedValue: "not-json",
            currentValue: "also-not-json",
          }),
        ]}
      />
    );
    expect(screen.getByText("not-json")).toBeInTheDocument();
    expect(screen.getByText("also-not-json")).toBeInTheDocument();
  });

  it("approves single extraction and calls router.refresh", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);

    const approveButtons = screen.getAllByRole("button");
    // Last two buttons in the extraction row are approve/reject icons
    const approveBtn = approveButtons.find((b) =>
      b.querySelector("svg.lucide-circle-check-big, svg.lucide-check-circle")
    );
    // Fallback: single-icon approve is the one with "text-green-600" class
    const singleApprove =
      approveBtn ||
      approveButtons.find(
        (b) =>
          b.className.includes("text-green-600") &&
          !b.textContent?.match(/approve all/i)
      );
    fireEvent.click(singleApprove!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-1/approve",
        { method: "POST" }
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("alerts on approve error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "approve failed" }),
    });
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);

    const btns = screen.getAllByRole("button");
    const singleApprove = btns.find(
      (b) =>
        b.className.includes("text-green-600") &&
        !b.textContent?.match(/approve all/i)
    )!;
    fireEvent.click(singleApprove);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("approve failed");
    });
  });

  it("rejects single extraction and calls router.refresh", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);

    const btns = screen.getAllByRole("button");
    const singleReject = btns.find(
      (b) =>
        b.className.includes("text-red-600") &&
        !b.textContent?.match(/reject all/i)
    )!;
    fireEvent.click(singleReject);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-1/reject",
        { method: "POST" }
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("alerts on reject error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "reject failed" }),
    });
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);

    const btns = screen.getAllByRole("button");
    const singleReject = btns.find(
      (b) =>
        b.className.includes("text-red-600") &&
        !b.textContent?.match(/reject all/i)
    )!;
    fireEvent.click(singleReject);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("reject failed");
    });
  });

  it("bulk-approves all extractions for a park", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction(),
          makeExtraction({ id: "ext-2", fieldName: "amenities" }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /approve all/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-1/approve",
        { method: "POST" }
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-2/approve",
        { method: "POST" }
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("bulk-approve stops and alerts on first error", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "first failed" }),
      });
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction(),
          makeExtraction({ id: "ext-2", fieldName: "amenities" }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /approve all/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        expect.stringContaining("first failed")
      );
    });
    // Only the first call made
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("bulk-rejects all extractions for a park", async () => {
    mockFetch.mockResolvedValue({ ok: true });
    render(
      <FieldExtractionReview
        extractions={[
          makeExtraction(),
          makeExtraction({ id: "ext-2", fieldName: "amenities" }),
        ]}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /reject all/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-1/reject",
        { method: "POST" }
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/extractions/ext-2/reject",
        { method: "POST" }
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("falls back to generic error message when response has no error field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    render(<FieldExtractionReview extractions={[makeExtraction()]} />);

    const btns = screen.getAllByRole("button");
    const singleApprove = btns.find(
      (b) =>
        b.className.includes("text-green-600") &&
        !b.textContent?.match(/approve all/i)
    )!;
    fireEvent.click(singleApprove);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Failed to approve");
    });
  });

  it("renders nothing when extractions list is empty", () => {
    const { container } = render(<FieldExtractionReview extractions={[]} />);
    expect(container.querySelector("h2")).toBeNull();
  });

  describe("typed editors", () => {
    const openEdit = () =>
      fireEvent.click(screen.getByTitle(/edit value before approving/i));

    const approveWithEdit = () =>
      fireEvent.click(screen.getByRole("button", { name: /approve with edit/i }));

    const lastEditedValue = () =>
      JSON.parse(JSON.parse(mockFetch.mock.calls[0][1].body).editedValue);

    it("edits an array field via option chips and approves selected values", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "amenities",
              extractedValue: JSON.stringify(["restrooms"]),
              currentValue: JSON.stringify([]),
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.click(screen.getByText("Showers")); // add another option
      approveWithEdit();

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/admin/ai-research/extractions/ext-1/approve",
          expect.objectContaining({ method: "POST" })
        );
      });
      expect(lastEditedValue()).toEqual(["restrooms", "showers"]);
    });

    it("blocks approving an array field with nothing selected", () => {
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "terrain",
              extractedValue: JSON.stringify(["sand"]),
              currentValue: JSON.stringify([]),
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.click(screen.getByText("Sand")); // unselect the only value
      approveWithEdit();
      expect(screen.getByText(/select at least one option/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("edits ownership via a dropdown constrained to valid options", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "ownership",
              extractedValue: JSON.stringify("private"),
              currentValue: JSON.stringify("public"),
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "mixed" },
      });
      approveWithEdit();
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(lastEditedValue()).toBe("mixed");
    });

    it("edits a boolean field via a Yes/No dropdown", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "permitRequired",
              extractedValue: JSON.stringify(true),
              currentValue: JSON.stringify(false),
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: "false" },
      });
      approveWithEdit();
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(lastEditedValue()).toBe(false);
    });

    it("approves a valid number edit as a number", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "acres",
              extractedValue: JSON.stringify(100),
              currentValue: null,
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "250" },
      });
      approveWithEdit();
      await waitFor(() => expect(mockFetch).toHaveBeenCalled());
      expect(lastEditedValue()).toBe(250);
    });

    it("blocks approving an empty number edit", () => {
      render(
        <FieldExtractionReview
          extractions={[
            makeExtraction({
              fieldName: "acres",
              extractedValue: JSON.stringify(100),
              currentValue: null,
            }),
          ]}
        />
      );
      openEdit();
      fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "" } });
      approveWithEdit();
      expect(screen.getByText(/valid number/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
