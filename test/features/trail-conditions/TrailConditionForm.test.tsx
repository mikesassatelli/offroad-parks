import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrailConditionForm } from "@/features/trail-conditions/TrailConditionForm";
import { vi } from "vitest";

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, disabled, type, onClick }: any) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, placeholder, maxLength, rows, className }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="condition-select"
      data-value={value}
      onClick={() => onValueChange?.("OPEN")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

describe("TrailConditionForm", () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render status dropdown and note textarea", () => {
    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByTestId("condition-select")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Optional short note/),
    ).toBeInTheDocument();
  });

  it("should render submit button as disabled when no status selected", () => {
    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    const button = screen.getByRole("button", { name: /Report Condition/i });
    expect(button).toBeDisabled();
  });

  it("should enable submit button after status is selected", () => {
    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    fireEvent.click(screen.getByTestId("condition-select"));

    const button = screen.getByRole("button", { name: /Report Condition/i });
    expect(button).not.toBeDisabled();
  });

  it("should show character count when note is entered", () => {
    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    const textarea = screen.getByPlaceholderText(/Optional short note/);
    fireEvent.change(textarea, { target: { value: "Trails are wet" } });

    expect(screen.getByText(/14\/280/)).toBeInTheDocument();
    expect(screen.getByText(/admin review/)).toBeInTheDocument();
  });

  it("should submit with PUBLISHED status when no note and call onSuccess", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        condition: { reportStatus: "PUBLISHED" },
        message: "Condition reported successfully.",
      }),
    } as any);

    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    // Select a status
    fireEvent.click(screen.getByTestId("condition-select"));

    // Submit
    fireEvent.submit(screen.getByRole("button", { name: /Report Condition/i }).closest("form")!);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/parks/test-park/conditions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should show error message on API failure", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    } as any);

    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    fireEvent.click(screen.getByTestId("condition-select"));
    fireEvent.submit(
      screen.getByRole("button", { name: /Report Condition/i }).closest("form")!,
    );

    await waitFor(() => {
      expect(screen.getByText("Unauthorized")).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it("should show 'Submitting…' while in flight", async () => {
    let resolveFetch!: (v: any) => void;
    vi.mocked(global.fetch).mockReturnValue(
      new Promise((res) => { resolveFetch = res; }) as any,
    );

    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    fireEvent.click(screen.getByTestId("condition-select"));
    fireEvent.submit(
      screen.getByRole("button", { name: /Report Condition/i }).closest("form")!,
    );

    expect(await screen.findByRole("button", { name: /Submitting/i })).toBeInTheDocument();

    resolveFetch({ ok: true, json: async () => ({ success: true, message: "ok", condition: {} }) });
  });

  it("should render all 6 condition status options", () => {
    render(
      <TrailConditionForm parkSlug="test-park" onSuccess={mockOnSuccess} />,
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(screen.getByText("Caution")).toBeInTheDocument();
    expect(screen.getByText("Muddy")).toBeInTheDocument();
    expect(screen.getByText("Wet")).toBeInTheDocument();
    expect(screen.getByText("Snow")).toBeInTheDocument();
  });
});
