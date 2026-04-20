import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { DomainReliabilityTable } from "@/components/admin/DomainReliabilityTable";
import type { DomainReliabilitySummary } from "@/lib/types";

const mockRouterRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

const makeDomain = (
  overrides?: Partial<DomainReliabilitySummary>
): DomainReliabilitySummary => ({
  id: "dom-1",
  domainPattern: ".gov",
  defaultReliability: 80,
  isBlocked: false,
  notes: "Government sites",
  createdAt: "2026-04-01T00:00:00Z",
  ...overrides,
});

describe("DomainReliabilityTable", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockAlert: ReturnType<typeof vi.fn>;
  let mockConfirm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    mockAlert = vi.fn();
    mockConfirm = vi.fn(() => true);
    global.fetch = mockFetch as any;
    global.alert = mockAlert as any;
    global.confirm = mockConfirm as any;
    vi.clearAllMocks();
  });

  it("renders heading, description, and Add Domain button", () => {
    render(<DomainReliabilityTable domains={[]} />);
    expect(
      screen.getByRole("heading", { name: /domain reliability/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add domain/i })).toBeInTheDocument();
  });

  it("shows empty state when no domains exist", () => {
    render(<DomainReliabilityTable domains={[]} />);
    expect(
      screen.getByText(/no domain reliability entries yet/i)
    ).toBeInTheDocument();
  });

  it("renders domains with pattern, reliability, and notes", () => {
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    expect(screen.getByText(".gov")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("Government sites")).toBeInTheDocument();
  });

  it("shows '--' for null notes", () => {
    render(
      <DomainReliabilityTable domains={[makeDomain({ notes: null })]} />
    );
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  it("displays blocked status badge", () => {
    render(
      <DomainReliabilityTable
        domains={[makeDomain({ isBlocked: true })]}
      />
    );
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("displays active status badge when not blocked", () => {
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("styles high reliability (>=70) in green tone", () => {
    render(
      <DomainReliabilityTable
        domains={[makeDomain({ defaultReliability: 90 })]}
      />
    );
    const el = screen.getByText("90");
    expect(el.className).toMatch(/green/);
  });

  it("styles medium reliability (40-69) in yellow tone", () => {
    render(
      <DomainReliabilityTable
        domains={[makeDomain({ defaultReliability: 50 })]}
      />
    );
    const el = screen.getByText("50");
    expect(el.className).toMatch(/yellow/);
  });

  it("styles low reliability (<40) in red tone", () => {
    render(
      <DomainReliabilityTable
        domains={[makeDomain({ defaultReliability: 20 })]}
      />
    );
    const el = screen.getByText("20");
    expect(el.className).toMatch(/red/);
  });

  it("toggles add form when Add Domain is clicked", () => {
    render(<DomainReliabilityTable domains={[]} />);
    expect(
      screen.queryByPlaceholderText(/\.gov or example\.com/i)
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    expect(
      screen.getByPlaceholderText(/\.gov or example\.com/i)
    ).toBeInTheDocument();
  });

  it("closes add form when Cancel is clicked", () => {
    render(<DomainReliabilityTable domains={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByPlaceholderText(/\.gov or example\.com/i)
    ).not.toBeInTheDocument();
  });

  it("submits new domain and calls router.refresh on success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<DomainReliabilityTable domains={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    await user.type(
      screen.getByPlaceholderText(/\.gov or example\.com/i),
      ".edu"
    );
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/domains",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(".edu"),
        })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("does not submit when domain pattern is empty/whitespace", async () => {
    render(<DomainReliabilityTable domains={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    // form has `required` on pattern input — browser will block submission
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("alerts on add error", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "dup domain" }),
    });
    render(<DomainReliabilityTable domains={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    await user.type(
      screen.getByPlaceholderText(/\.gov or example\.com/i),
      ".org"
    );
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("dup domain");
    });
  });

  it("enters edit mode when Edit button is clicked", () => {
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    const editBtn = screen.getByTitle(/edit/i);
    fireEvent.click(editBtn);
    // Save + Cancel icons appear
    expect(screen.getByTitle(/save/i)).toBeInTheDocument();
    expect(screen.getByTitle(/cancel/i)).toBeInTheDocument();
  });

  it("cancels edit mode", () => {
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/edit/i));
    fireEvent.click(screen.getByTitle(/cancel/i));
    expect(screen.getByTitle(/edit/i)).toBeInTheDocument();
  });

  it("saves edits via PATCH", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/edit/i));
    fireEvent.click(screen.getByTitle(/save/i));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/domains",
        expect.objectContaining({ method: "PATCH" })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("alerts on save error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "save failed" }),
    });
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/edit/i));
    fireEvent.click(screen.getByTitle(/save/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("save failed");
    });
  });

  it("deletes after confirm", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/delete/i));

    await waitFor(() => {
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/ai-research/domains",
        expect.objectContaining({ method: "DELETE" })
      );
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });

  it("does not call fetch when delete confirm is canceled", async () => {
    mockConfirm.mockReturnValueOnce(false);
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/delete/i));

    await new Promise((r) => setTimeout(r, 10));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("alerts on delete API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "delete failed" }),
    });
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/delete/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("delete failed");
    });
  });

  it("alerts 'Network error' when delete fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("boom"));
    render(<DomainReliabilityTable domains={[makeDomain()]} />);
    fireEvent.click(screen.getByTitle(/delete/i));

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith("Network error");
    });
  });

  it("toggles blocked checkbox in edit mode", async () => {
    render(
      <DomainReliabilityTable
        domains={[makeDomain({ isBlocked: false })]}
      />
    );
    fireEvent.click(screen.getByTitle(/edit/i));
    const checkbox = screen.getByLabelText(/blocked/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it("allows typing in reliability input during add", async () => {
    const user = userEvent.setup();
    const { container } = render(<DomainReliabilityTable domains={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    const relInput = container.querySelector(
      'input[type="number"]'
    ) as HTMLInputElement;
    await user.clear(relInput);
    await user.type(relInput, "75");
    expect(relInput.value).toBe("75");
  });

  it("toggles blocked checkbox in add form", () => {
    render(<DomainReliabilityTable domains={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /add domain/i }));
    const checkbox = screen.getByLabelText(/blocked/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
