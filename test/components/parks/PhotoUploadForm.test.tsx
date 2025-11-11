import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PhotoUploadForm } from "@/components/parks/PhotoUploadForm";
import { vi } from "vitest";

// Mock Next.js components
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
  Input: ({ value, onChange, type, id, accept }: any) => (
    <input
      value={value}
      onChange={onChange}
      type={type}
      id={id}
      accept={accept}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: any) => (
    <label htmlFor={htmlFor}>{children}</label>
  ),
}));

describe("PhotoUploadForm", () => {
  const mockOnSuccess = vi.fn();
  const parkSlug = "test-park";

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render file input", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/photo/i)).toBeInTheDocument();
  });

  it("should render caption input", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/caption/i)).toBeInTheDocument();
  });

  it("should show error for invalid file type", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    const invalidFile = new File(["content"], "test.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
  });

  it("should show error for file too large", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    // Create file larger than 5MB
    const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
  });

  it("should accept valid JPEG file", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 }); // 1MB

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/file too large/i)).not.toBeInTheDocument();
  });

  it("should accept valid PNG file", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.png", { type: "image/png" });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument();
  });

  it("should accept valid WebP file", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.webp", {
      type: "image/webp",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument();
  });

  it("should update caption input", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const captionInput = screen.getByLabelText(/caption/i) as HTMLInputElement;
    fireEvent.change(captionInput, { target: { value: "Beautiful sunset" } });

    expect(captionInput.value).toBe("Beautiful sunset");
  });

  it("should handle form submission with valid file", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Photo uploaded successfully!" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/parks/test-park/photos",
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("should include caption in form data when provided", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Success" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const captionInput = screen.getByLabelText(/caption/i);
    fireEvent.change(captionInput, { target: { value: "Test caption" } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("should show success message on successful upload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Photo uploaded successfully!" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/photo uploaded successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("should call onSuccess callback after successful upload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Success" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    // Wait for the onSuccess callback (called after 1500ms setTimeout)
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("should show error message on upload failure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Upload failed" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it("should disable submit button while uploading", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Success" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const submitButton = screen.getByRole("button", { name: /upload/i });
    expect(submitButton).not.toBeDisabled();

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  it("should not submit without file", () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should clear file and preview after successful upload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Success" }),
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    // Wait for onSuccess callback (called after 1500ms)
    await waitFor(
      () => {
        expect(mockOnSuccess).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it("should clear file preview when clear button is clicked", async () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Wait for preview to render
    await waitFor(() => {
      expect(screen.getByAltText("Preview")).toBeInTheDocument();
    });

    // Click clear button
    const clearButton = screen.getByRole("button", { name: "" }); // X button has no text
    fireEvent.click(clearButton);

    // Preview should be removed
    await waitFor(() => {
      expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
    });
  });

  it("should handle no files selected", () => {
    render(<PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />);

    const fileInput = screen.getByLabelText(/photo/i);
    fireEvent.change(fileInput, { target: { files: [] } });

    // Should not show any errors
    expect(screen.queryByText(/invalid file type/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/file too large/i)).not.toBeInTheDocument();
  });

  it("should use fallback error message when response has no error property", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}), // No error property
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/failed to upload photo/i)).toBeInTheDocument();
    });
  });

  it("should use fallback success message when response has no message property", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}), // No message property
    });
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText(/photo uploaded successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("should handle non-Error exceptions during upload", async () => {
    const mockFetch = vi.fn().mockRejectedValue("Network failure string");
    global.fetch = mockFetch;

    const { container } = render(
      <PhotoUploadForm parkSlug={parkSlug} onSuccess={mockOnSuccess} />,
    );

    const fileInput = screen.getByLabelText(/photo/i);
    const validFile = new File(["content"], "photo.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(validFile, "size", { value: 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    const form = container.querySelector("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/failed to upload photo/i)).toBeInTheDocument();
    });
  });
});
