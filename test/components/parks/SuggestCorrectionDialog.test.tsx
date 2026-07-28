import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { useSession } from "next-auth/react";
import { SuggestCorrectionDialog } from "@/features/parks/detail/components/SuggestCorrectionDialog";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

const promptSignIn = vi.fn();
vi.mock("@/components/auth/SignInPromptProvider", () => ({
  useSignInPrompt: () => ({ promptSignIn }),
}));

// Mock the radix Dialog so open state is driven by the component's `open` prop
// and the trigger click flows through onOpenChange, mirroring real behavior.
vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  const Ctx = React.createContext<{
    open: boolean;
    onOpenChange?: (o: boolean) => void;
  }>({ open: false });
  return {
    Dialog: ({ open, onOpenChange, children }: any) => (
      <Ctx.Provider value={{ open: !!open, onOpenChange }}>
        {children}
      </Ctx.Provider>
    ),
    DialogTrigger: ({ children }: any) => {
      const { onOpenChange } = React.useContext(Ctx);
      return React.cloneElement(children, {
        onClick: (e: any) => {
          children.props.onClick?.(e);
          if (!e.defaultPrevented) onOpenChange?.(true);
        },
      });
    },
    DialogContent: ({ children }: any) => {
      const { open } = React.useContext(Ctx);
      return open ? <div data-testid="dialog-content">{children}</div> : null;
    },
    DialogHeader: ({ children }: any) => <div>{children}</div>,
    DialogFooter: ({ children }: any) => <div>{children}</div>,
    DialogTitle: ({ children }: any) => <h2>{children}</h2>,
    DialogDescription: ({ children }: any) => <p>{children}</p>,
  };
});

// Radix Checkbox (used by the embedded WeeklyHoursEditor) → native checkbox.
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
}));

// Mock the radix Select as a native <select> (radix Select doesn't work in jsdom).
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      value={value ?? ""}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => (
    <option value={value}>{children}</option>
  ),
}));

function signedIn() {
  vi.mocked(useSession).mockReturnValue({
    data: { user: { id: "u1", name: "Rider" } },
    status: "authenticated",
  } as any);
}
function signedOut() {
  vi.mocked(useSession).mockReturnValue({
    data: null,
    status: "unauthenticated",
  } as any);
}

const openDialog = () =>
  fireEvent.click(screen.getByRole("button", { name: /suggest a correction/i }));

describe("SuggestCorrectionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, message: "Thanks!" }),
      }),
    ) as any;
  });

  it("prompts sign-in and does not open when logged out", () => {
    signedOut();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    expect(promptSignIn).toHaveBeenCalled();
    expect(screen.queryByTestId("dialog-content")).not.toBeInTheDocument();
  });

  it("opens the dialog when logged in and shows the field picker", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" parkName="Test Park" />);
    openDialog();
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
    expect(promptSignIn).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /fix a specific detail/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /something else/i })).toBeInTheDocument();
  });

  it("switches to free-text mode", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.click(screen.getByRole("tab", { name: /something else/i }));
    expect(
      screen.getByLabelText(/what's wrong or missing/i),
    ).toBeInTheDocument();
  });

  it("renders a text input for a string field", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    const fieldSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(fieldSelect, { target: { value: "website" } });
    const input = screen.getByLabelText(/correct value/i);
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders a number input for a numeric field", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "dayPassUSD" },
    });
    expect(screen.getByLabelText(/correct value/i)).toHaveAttribute(
      "type",
      "number",
    );
  });

  it("renders a switch for a boolean field", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "isFree" },
    });
    expect(screen.getByRole("switch", { name: /correct value/i })).toBeInTheDocument();
  });

  it("renders an enum select for the ownership field", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "ownership" },
    });
    // Two comboboxes now: field picker + value select.
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("option", { name: /public/i })).toBeInTheDocument();
  });

  it("submits a field correction with the right payload", async () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "website" },
    });
    fireEvent.change(screen.getByLabelText(/correct value/i), {
      target: { value: "https://foo.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, opts] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("/api/parks/test-park/corrections");
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({
      kind: "field",
      fieldName: "website",
      value: "https://foo.com",
    });
    await screen.findByText(/thanks/i);
  });

  it("submits a numeric field correction as a number", async () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "acres" },
    });
    fireEvent.change(screen.getByLabelText(/correct value/i), {
      target: { value: "1200" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.value).toBe(1200);
  });

  it("renders the weekly-hours editor for the hours field", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "hours" },
    });
    expect(screen.getByTestId("weekly-hours-editor")).toBeInTheDocument();
    expect(screen.getByLabelText("Monday opening time")).toBeInTheDocument();
  });

  it("submits a weekly-hours correction as a structured object", async () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "hours" },
    });
    fireEvent.change(screen.getByLabelText("Monday opening time"), {
      target: { value: "08:00" },
    });
    fireEvent.change(screen.getByLabelText("Monday closing time"), {
      target: { value: "18:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.kind).toBe("field");
    expect(body.fieldName).toBe("hours");
    expect(body.value).toEqual({
      mon: { open: "08:00", close: "18:00" },
      tue: null,
      wed: null,
      thu: null,
      fri: null,
      sat: null,
      sun: null,
    });
  });

  it("blocks submit when no hours are set", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "hours" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/at least one day/i);
  });

  it("blocks submit and surfaces an error for invalid hours (open after close)", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "hours" },
    });
    fireEvent.change(screen.getByLabelText("Monday opening time"), {
      target: { value: "18:00" },
    });
    fireEvent.change(screen.getByLabelText("Monday closing time"), {
      target: { value: "08:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("submits a free-text report", async () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.click(screen.getByRole("tab", { name: /something else/i }));
    fireEvent.change(screen.getByLabelText(/what's wrong or missing/i), {
      target: { value: "Hours are outdated" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body).toEqual({ kind: "text", note: "Hours are outdated" });
  });

  it("blocks field submit with no field selected", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/pick a field/i);
  });

  it("blocks empty free-text submit", () => {
    signedIn();
    render(<SuggestCorrectionDialog parkSlug="test-park" />);
    openDialog();
    fireEvent.click(screen.getByRole("tab", { name: /something else/i }));
    fireEvent.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
