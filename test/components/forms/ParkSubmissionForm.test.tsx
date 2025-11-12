import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";
import { vi } from "vitest";

// Mock Next.js hooks and components
const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: any) => <img alt={alt} src={src} />,
}));

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, type, disabled }: any) => (
    <button onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    name,
    id,
    required,
    maxLength,
    disabled,
    className,
  }: any) => (
    <input
      value={value}
      onChange={onChange}
      name={name}
      id={id}
      required={required}
      maxLength={maxLength}
      disabled={disabled}
      className={className}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, name, id }: any) => (
    <textarea value={value} onChange={onChange} name={name} id={id} />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange?.("California")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      id={id}
    />
  ),
}));

describe("ParkSubmissionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the form with required fields", () => {
    render(<ParkSubmissionForm />);

    expect(screen.getByText("Park Name *")).toBeInTheDocument();
    expect(screen.getByText("State *")).toBeInTheDocument();
  });

  it("should render park name input", () => {
    render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText("Park Name *");
    expect(nameInput).toBeInTheDocument();
  });

  it("should update form state when name input changes", () => {
    render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText("Park Name *");
    fireEvent.change(nameInput, { target: { value: "Test Park" } });

    expect(nameInput).toHaveValue("Test Park");
  });

  it("should auto-generate slug from name for non-admin form", () => {
    render(<ParkSubmissionForm isAdminForm={false} />);

    const nameInput = screen.getByLabelText("Park Name *");
    fireEvent.change(nameInput, { target: { value: "My Awesome Park!" } });

    // The slug should be auto-generated (though we can't easily test the internal state)
    // We're testing that the function runs without errors
    expect(nameInput).toHaveValue("My Awesome Park!");
  });

  it("should show slug field when isAdminForm is true", () => {
    render(<ParkSubmissionForm isAdminForm={true} />);

    expect(screen.getByText("Slug *")).toBeInTheDocument();
  });

  it("should not show slug field when isAdminForm is false", () => {
    render(<ParkSubmissionForm isAdminForm={false} />);

    expect(screen.queryByText("Slug *")).not.toBeInTheDocument();
  });

  it("should render city input", () => {
    render(<ParkSubmissionForm />);

    expect(screen.getByLabelText("City")).toBeInTheDocument();
  });

  it("should sanitize phone number input to only digits", () => {
    render(<ParkSubmissionForm />);

    const phoneInput = screen.getByLabelText(/phone/i);
    fireEvent.change(phoneInput, { target: { value: "(555) 123-4567" } });

    // The component strips non-numeric characters
    expect(phoneInput).toHaveValue("5551234567");
  });

  it("should handle multiple input changes", () => {
    render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText("Park Name *");
    const cityInput = screen.getByLabelText("City");

    fireEvent.change(nameInput, { target: { value: "Test Park" } });
    fireEvent.change(cityInput, { target: { value: "Los Angeles" } });

    expect(nameInput).toHaveValue("Test Park");
    expect(cityInput).toHaveValue("Los Angeles");
  });

  it("should handle form submission with valid data", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/parks/submit",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
  });

  it("should show alert on successful submission for non-admin", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm isAdminForm={false} />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Park submitted for review! An admin will review it soon.",
      );
    });
  });

  it("should show alert on successful submission for admin", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm isAdminForm={true} />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Park created successfully!");
    });
  });

  it("should handle submission error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Validation failed" }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Failed to submit: Validation failed",
      );
    });
  });

  it("should handle network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const { container } = render(<ParkSubmissionForm />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(
        "Failed to submit park. Please try again.",
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it("should disable submit button while submitting", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const submitButton = screen.getByRole("button", { name: /submit/i });
    expect(submitButton).not.toBeDisabled();

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });

  it("should convert number inputs to proper types on submit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const latitudeInput = screen.getByLabelText(/latitude/i);
    const dayPassInput = screen.getByLabelText(/day pass/i);

    fireEvent.change(latitudeInput, { target: { value: "34.0522" } });
    fireEvent.change(dayPassInput, { target: { value: "25" } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.latitude).toBe(34.0522);
      expect(body.dayPassUSD).toBe(25);
    });
  });

  it("should handle empty number inputs as null", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.latitude).toBeNull();
      expect(body.dayPassUSD).toBeNull();
    });
  });

  it("should handle terrain checkbox selection", async () => {
    render(<ParkSubmissionForm />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i });
    fireEvent.click(sandCheckbox);

    expect(sandCheckbox).toBeChecked();
  });

  it("should handle difficulty checkbox selection", async () => {
    render(<ParkSubmissionForm />);

    const easyCheckbox = screen.getByRole("checkbox", { name: /easy/i });
    fireEvent.click(easyCheckbox);

    expect(easyCheckbox).toBeChecked();
  });

  it("should handle amenities checkbox selection", async () => {
    render(<ParkSubmissionForm />);

    const campingCheckbox = screen.getByRole("checkbox", { name: /camping/i });
    fireEvent.click(campingCheckbox);

    expect(campingCheckbox).toBeChecked();
  });

  it("should toggle checkbox when clicked twice", async () => {
    render(<ParkSubmissionForm />);

    const sandCheckbox = screen.getByRole("checkbox", { name: /sand/i });
    fireEvent.click(sandCheckbox);
    expect(sandCheckbox).toBeChecked();

    fireEvent.click(sandCheckbox);
    expect(sandCheckbox).not.toBeChecked();
  });

  it("should handle state selection", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    // The Select component is mocked, so we test by submitting
    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("should sanitize phone number input", () => {
    render(<ParkSubmissionForm />);

    const phoneInput = screen.getByLabelText(/phone/i);
    fireEvent.change(phoneInput, {
      target: { name: "phone", value: "(555) 123-4567" },
    });

    expect(phoneInput).toHaveValue("5551234567");
  });

  it("should handle photo file selection", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ParkSubmissionForm />);

    const file = new File(["dummy content"], "test.jpg", {
      type: "image/jpeg",
    });
    const fileInput = screen.getByLabelText(/photos/i);

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    // File should be added (preview generation is async)
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("should reject invalid file types", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ParkSubmissionForm />);

    const file = new File(["dummy content"], "test.pdf", {
      type: "application/pdf",
    });
    const fileInput = screen.getByLabelText(/photos/i);

    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid file type"),
    );
    alertSpy.mockRestore();
  });

  it("should reject files larger than 5MB", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ParkSubmissionForm />);

    const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile, "size", {
      value: 6 * 1024 * 1024,
      writable: false,
    });

    const fileInput = screen.getByLabelText(/photos/i);
    Object.defineProperty(fileInput, "files", {
      value: [largeFile],
      writable: false,
    });

    fireEvent.change(fileInput);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("File too large"),
    );
    alertSpy.mockRestore();
  });

  it("should limit to 5 photos maximum", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<ParkSubmissionForm />);

    const fileInput = screen.getByLabelText(/photos/i);

    // Try to add 6 photos at once
    const files = Array.from(
      { length: 6 },
      (_, i) => new File(["content"], `test${i}.jpg`, { type: "image/jpeg" }),
    );

    Object.defineProperty(fileInput, "files", {
      value: files,
      writable: false,
    });
    fireEvent.change(fileInput);

    expect(alertSpy).toHaveBeenCalledWith("Maximum 5 photos allowed");
    alertSpy.mockRestore();
  });

  it("should upload photos after park submission", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    global.fetch = mockFetch;
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ParkSubmissionForm />);

    // Add a photo
    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText(/photos/i);
    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Fill required field
    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    // Submit form
    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toContain(
        "/api/parks/test-park/photos",
      );
    });

    alertSpy.mockRestore();
  });

  it("should handle photo upload errors gracefully", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    global.fetch = mockFetch;
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ParkSubmissionForm />);

    // Add a photo
    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText(/photos/i);
    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Fill required field
    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    // Submit form
    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to upload photo:",
        expect.any(Error),
      );
    });

    consoleErrorSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it("should show admin success message on admin form", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ParkSubmissionForm isAdminForm={true} />);

    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Park created successfully!");
    });

    alertSpy.mockRestore();
  });

  it("should render admin-specific slug field", () => {
    render(<ParkSubmissionForm isAdminForm={true} />);

    expect(screen.getByLabelText(/slug/i)).toBeInTheDocument();
  });

  it("should allow admin to manually set slug", () => {
    render(<ParkSubmissionForm isAdminForm={true} />);

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;
    fireEvent.change(slugInput, {
      target: { name: "slug", value: "custom-slug" },
    });

    expect(slugInput.value).toBe("custom-slug");
  });

  it("should not auto-generate slug for admin form", () => {
    render(<ParkSubmissionForm isAdminForm={true} />);

    const nameInput = screen.getByLabelText(/park name/i);
    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement;

    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park Name" },
    });

    // Slug should remain empty for admin form (not auto-generated)
    expect(slugInput.value).toBe("");
  });

  it("should remove photo when remove button is clicked", async () => {
    global.FileReader = class {
      readAsDataURL = vi.fn();
      onloadend: (() => void) | null = null;
      result: string | null = "data:image/jpeg;base64,fake";

      constructor() {
        setTimeout(() => {
          this.onloadend?.();
        }, 0);
      }
    } as any;

    render(<ParkSubmissionForm />);

    // Add a photo
    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const fileInput = screen.getByLabelText(/photos/i);
    Object.defineProperty(fileInput, "files", {
      value: [file],
      writable: false,
    });
    fireEvent.change(fileInput);

    // Wait for preview to render
    await waitFor(() => {
      expect(screen.getByAltText("Preview 1")).toBeInTheDocument();
    });

    // Click remove button
    const removeButton = screen.getByRole("button", { name: "" });
    fireEvent.click(removeButton);

    // Photo preview should be removed
    await waitFor(() => {
      expect(screen.queryByAltText("Preview 1")).not.toBeInTheDocument();
    });
  });

  it("should handle notes textarea change", () => {
    render(<ParkSubmissionForm />);

    const notesTextarea = screen.getByLabelText(/additional notes/i);
    fireEvent.change(notesTextarea, {
      target: {
        name: "notes",
        value: "This is a great park with stunning views",
      },
    });

    expect(notesTextarea).toHaveValue(
      "This is a great park with stunning views",
    );
  });

  it("should handle latitude input change", () => {
    render(<ParkSubmissionForm />);

    const latitudeInput = screen.getByLabelText(/latitude/i);
    fireEvent.change(latitudeInput, {
      target: { name: "latitude", value: "34.0522" },
    });

    expect(latitudeInput).toHaveValue("34.0522");
  });

  it("should handle longitude input change", () => {
    render(<ParkSubmissionForm />);

    const longitudeInput = screen.getByLabelText(/longitude/i);
    fireEvent.change(longitudeInput, {
      target: { name: "longitude", value: "-118.2437" },
    });

    expect(longitudeInput).toHaveValue("-118.2437");
  });

  it("should handle website input change", () => {
    render(<ParkSubmissionForm />);

    const websiteInput = screen.getByLabelText(/website/i);
    fireEvent.change(websiteInput, {
      target: { name: "website", value: "https://example.com" },
    });

    expect(websiteInput).toHaveValue("https://example.com");
  });

  it("should handle dayPassUSD input change", () => {
    render(<ParkSubmissionForm />);

    const dayPassInput = screen.getByLabelText(/day pass/i);
    fireEvent.change(dayPassInput, {
      target: { name: "dayPassUSD", value: "35.50" },
    });

    expect(dayPassInput).toHaveValue("35.50");
  });

  it("should handle milesOfTrails input change", () => {
    render(<ParkSubmissionForm />);

    const milesInput = screen.getByLabelText(/miles of trails/i);
    fireEvent.change(milesInput, {
      target: { name: "milesOfTrails", value: "150" },
    });

    expect(milesInput).toHaveValue("150");
  });

  it("should handle acres input change", () => {
    render(<ParkSubmissionForm />);

    const acresInput = screen.getByLabelText(/acres/i);
    fireEvent.change(acresInput, {
      target: { name: "acres", value: "5000" },
    });

    expect(acresInput).toHaveValue("5000");
  });

  it("should handle submitterName input change for non-admin", () => {
    render(<ParkSubmissionForm isAdminForm={false} />);

    const submitterInput = screen.getByLabelText(/your name/i);
    fireEvent.change(submitterInput, {
      target: { name: "submitterName", value: "John Doe" },
    });

    expect(submitterInput).toHaveValue("John Doe");
  });

  it("should not show submitterName field for admin", () => {
    render(<ParkSubmissionForm isAdminForm={true} />);

    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
  });

  it("should handle state selection change", () => {
    render(<ParkSubmissionForm />);

    // Find and click the select to trigger onValueChange
    const selectElement = screen.getByTestId("select");
    fireEvent.click(selectElement);

    // The mock will call onValueChange with 'California'
    expect(selectElement.getAttribute("data-value")).toBe("California");
  });

  it("should call router.back when cancel button is clicked", () => {
    render(<ParkSubmissionForm />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockBack).toHaveBeenCalledOnce();
  });

  it("should handle file input with null files", () => {
    const { container } = render(<ParkSubmissionForm />);

    const fileInput = container.querySelector('input[type="file"]');

    // Simulate file input change with null files (edge case)
    Object.defineProperty(fileInput, "files", { value: null, writable: true });
    fireEvent.change(fileInput!);

    // Should not crash and should handle gracefully
    expect(fileInput).toBeInTheDocument();
  });

  it("should submit form with longitude value", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    // Fill required and optional fields
    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const longitudeInput = screen.getByLabelText(/longitude/i);
    fireEvent.change(longitudeInput, {
      target: { name: "longitude", value: "-118.5" },
    });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/parks/submit",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("-118.5"),
        }),
      );
    });

    // Verify the body contains parsed longitude
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.longitude).toBe(-118.5);
  });

  it("should submit form with milesOfTrails value", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const milesInput = screen.getByLabelText(/miles of trails/i);
    fireEvent.change(milesInput, {
      target: { name: "milesOfTrails", value: "150" },
    });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.milesOfTrails).toBe(150);
  });

  it("should submit form with acres value", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ park: { slug: "test-park", id: "park-123" } }),
    });
    global.fetch = mockFetch;

    const { container } = render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const acresInput = screen.getByLabelText(/acres/i);
    fireEvent.change(acresInput, { target: { name: "acres", value: "2000" } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.acres).toBe(2000);
  });

  it('should use "Unknown error" fallback when error response has no error property', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}), // No error property
    });
    global.fetch = mockFetch;
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ParkSubmissionForm />);

    const nameInput = screen.getByLabelText(/park name/i);
    fireEvent.change(nameInput, {
      target: { name: "name", value: "Test Park" },
    });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Failed to submit: Unknown error");
    });

    alertSpy.mockRestore();
  });

  describe("Edit Mode", () => {
    const mockInitialData = {
      name: "Existing Park",
      slug: "existing-park",
      city: "Test City",
      state: "California",
      latitude: "37.7749",
      longitude: "-122.4194",
      website: "https://example.com",
      phone: "5551234567",
      dayPassUSD: "25.50",
      milesOfTrails: "100",
      acres: "5000",
      notes: "Test notes",
      submitterName: "",
      terrain: ["sand", "rocks"],
      difficulty: ["moderate", "difficult"],
      amenities: ["camping", "restrooms"],
    };

    it("should render form with initial data in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      expect(screen.getByLabelText(/park name/i)).toHaveValue("Existing Park");
      expect(screen.getByLabelText(/slug/i)).toHaveValue("existing-park");
      expect(screen.getByLabelText(/city/i)).toHaveValue("Test City");
      expect(screen.getByLabelText(/latitude/i)).toHaveValue("37.7749");
      expect(screen.getByLabelText(/longitude/i)).toHaveValue("-122.4194");
      expect(screen.getByLabelText(/website/i)).toHaveValue(
        "https://example.com",
      );
      expect(screen.getByLabelText(/phone/i)).toHaveValue("5551234567");
      expect(screen.getByLabelText(/day pass price/i)).toHaveValue("25.50");
      expect(screen.getByLabelText(/miles of trails/i)).toHaveValue("100");
      expect(screen.getByLabelText(/acres/i)).toHaveValue("5000");
      expect(screen.getByLabelText(/additional notes/i)).toHaveValue(
        "Test notes",
      );
    });

    it("should disable slug field in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const slugInput = screen.getByLabelText(/slug/i);
      expect(slugInput).toBeDisabled();
      expect(screen.getByText(/slug \* \(read-only\)/i)).toBeInTheDocument();
    });

    it("should show correct button text in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      expect(screen.getByText("Update Park")).toBeInTheDocument();
    });

    it("should not show photo upload section in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
          existingPhotoCount={0}
        />,
      );

      expect(screen.queryByText(/click to upload photos/i)).not.toBeInTheDocument();
    });

    it("should show existing photo count message when photos exist", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
          existingPhotoCount={3}
        />,
      );

      expect(
        screen.getByText(/this park has 3 existing photos/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/photo management is not available in edit mode/i),
      ).toBeInTheDocument();
    });

    it("should handle singular photo count correctly", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
          existingPhotoCount={1}
        />,
      );

      expect(
        screen.getByText(/this park has 1 existing photo\./i),
      ).toBeInTheDocument();
    });

    it("should send PATCH request to correct endpoint in edit mode", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ park: { id: "park-123", slug: "existing-park" } }),
      });
      global.fetch = mockFetch;

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/admin/parks/park-123",
          expect.objectContaining({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          }),
        );
      });
    });

    it("should show success message and redirect after successful update", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ park: { id: "park-123", slug: "existing-park" } }),
      });
      global.fetch = mockFetch;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Park updated successfully!");
        expect(mockPush).toHaveBeenCalledWith("/admin/parks?highlight=park-123");
      });

      alertSpy.mockRestore();
    });

    it("should not upload photos in edit mode even if photos were added", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ park: { id: "park-123", slug: "existing-park" } }),
      });
      global.fetch = mockFetch;

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1); // Only PATCH call, no photo uploads
      });
    });

    it("should handle update errors with correct message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Update failed" }),
      });
      global.fetch = mockFetch;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to update: Update failed");
      });

      alertSpy.mockRestore();
    });

    it("should handle update errors without error message", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });
      global.fetch = mockFetch;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith("Failed to update: Unknown error");
      });

      alertSpy.mockRestore();
    });

    it("should update form fields in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const nameInput = screen.getByLabelText(/park name/i);
      fireEvent.change(nameInput, {
        target: { name: "name", value: "Updated Park Name" },
      });

      expect(nameInput).toHaveValue("Updated Park Name");
    });

    it("should not auto-generate slug when name changes in edit mode", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const nameInput = screen.getByLabelText(/park name/i);
      const slugInput = screen.getByLabelText(/slug/i);

      fireEvent.change(nameInput, {
        target: { name: "name", value: "Completely Different Name" },
      });

      // Slug should remain unchanged
      expect(slugInput).toHaveValue("existing-park");
      expect(slugInput).toBeDisabled();
    });

    it("should check terrain checkboxes based on initial data", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const sandCheckbox = screen.getByLabelText(/sand/i);
      const rocksCheckbox = screen.getByLabelText(/rocks/i);
      const mudCheckbox = screen.getByLabelText(/mud/i);

      expect(sandCheckbox).toBeChecked();
      expect(rocksCheckbox).toBeChecked();
      expect(mudCheckbox).not.toBeChecked();
    });

    it("should check difficulty checkboxes based on initial data", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const easyCheckbox = screen.getByLabelText(/^easy$/i);
      const moderateCheckbox = screen.getByLabelText(/moderate/i);
      const difficultCheckbox = screen.getByLabelText(/^difficult$/i);
      const extremeCheckbox = screen.getByLabelText(/extreme/i);

      expect(easyCheckbox).not.toBeChecked();
      expect(moderateCheckbox).toBeChecked();
      expect(difficultCheckbox).toBeChecked();
      expect(extremeCheckbox).not.toBeChecked();
    });

    it("should check amenity checkboxes based on initial data", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const campingCheckbox = screen.getByLabelText(/camping/i);
      const restroomsCheckbox = screen.getByLabelText(/restrooms/i);
      const showersCheckbox = screen.getByLabelText(/showers/i);

      expect(campingCheckbox).toBeChecked();
      expect(restroomsCheckbox).toBeChecked();
      expect(showersCheckbox).not.toBeChecked();
    });

    it("should send all form data including updates in PATCH request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ park: { id: "park-123", slug: "existing-park" } }),
      });
      global.fetch = mockFetch;

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      // Update a field
      const cityInput = screen.getByLabelText(/city/i);
      fireEvent.change(cityInput, {
        target: { name: "city", value: "Updated City" },
      });

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/admin/parks/park-123",
          expect.objectContaining({
            method: "PATCH",
            body: expect.stringContaining('"city":"Updated City"'),
          }),
        );
      });
    });

    it("should show 'Updating...' text when submitting in edit mode", async () => {
      const mockFetch = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    park: { id: "park-123", slug: "existing-park" },
                  }),
                }),
              100,
            ),
          ),
      );
      global.fetch = mockFetch;

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      // Should show "Updating..." while submitting
      await waitFor(() => {
        expect(screen.getByText("Updating...")).toBeInTheDocument();
      });
    });

    it("should not show existing photo message when existingPhotoCount is 0", () => {
      render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
          existingPhotoCount={0}
        />,
      );

      expect(
        screen.queryByText(/this park has.*existing photo/i),
      ).not.toBeInTheDocument();
    });

    it("should handle network error in edit mode", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;
      const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

      const { container } = render(
        <ParkSubmissionForm
          isAdminForm={true}
          initialData={mockInitialData}
          parkId="park-123"
        />,
      );

      const form = container.querySelector("form");
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          "Failed to update park. Please try again.",
        );
      });

      alertSpy.mockRestore();
    });
  });
});
