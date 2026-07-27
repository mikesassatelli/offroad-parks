import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { vi } from "vitest";

// Mock next/image so previews render as plain <img> in jsdom.
vi.mock("next/image", () => ({
  default: ({ alt, src }: any) => <img alt={alt} src={src} />,
}));

function makeFile(name: string, type: string, size = 1024 * 1024): File {
  const file = new File(["content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function getPhotoInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector("#review-photos") as HTMLInputElement;
}

describe("ReviewForm photo picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Deterministic FileReader that fires onloadend with a data URL.
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

  it("renders the optional photo picker", () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);
    expect(screen.getByText(/photos \(optional\)/i)).toBeInTheDocument();
    expect(getPhotoInput(container)).toBeInTheDocument();
  });

  it("adds a valid photo and shows a preview", async () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);

    fireEvent.change(getPhotoInput(container), {
      target: { files: [makeFile("photo.jpg", "image/jpeg")] },
    });

    await waitFor(() => {
      expect(screen.getByAltText("Review photo 1")).toBeInTheDocument();
    });
  });

  it("rejects an invalid file type", () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);

    fireEvent.change(getPhotoInput(container), {
      target: { files: [makeFile("doc.txt", "text/plain")] },
    });

    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    expect(screen.queryByAltText("Review photo 1")).not.toBeInTheDocument();
  });

  it("rejects a file that is too large", () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);

    fireEvent.change(getPhotoInput(container), {
      target: { files: [makeFile("big.jpg", "image/jpeg", 6 * 1024 * 1024)] },
    });

    expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    expect(screen.queryByAltText("Review photo 1")).not.toBeInTheDocument();
  });

  it("enforces the max photo count of 4", () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);

    fireEvent.change(getPhotoInput(container), {
      target: {
        files: [
          makeFile("1.jpg", "image/jpeg"),
          makeFile("2.jpg", "image/jpeg"),
          makeFile("3.jpg", "image/jpeg"),
          makeFile("4.jpg", "image/jpeg"),
          makeFile("5.jpg", "image/jpeg"),
        ],
      },
    });

    expect(
      screen.getByText(/you can attach up to 4 photos/i),
    ).toBeInTheDocument();
    // Only 4 remove buttons should be present (one per accepted photo).
    expect(
      screen.getAllByRole("button", { name: /remove photo/i }),
    ).toHaveLength(4);
    // The dropzone input is hidden once the max is reached.
    expect(getPhotoInput(container)).not.toBeInTheDocument();
  });

  it("removes a selected photo", async () => {
    const { container } = render(<ReviewForm onSubmit={vi.fn()} />);

    fireEvent.change(getPhotoInput(container), {
      target: {
        files: [
          makeFile("1.jpg", "image/jpeg"),
          makeFile("2.jpg", "image/jpeg"),
        ],
      },
    });

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /remove photo/i }),
      ).toHaveLength(2);
    });

    fireEvent.click(
      screen.getAllByRole("button", { name: /remove photo/i })[0],
    );

    expect(
      screen.getAllByRole("button", { name: /remove photo/i }),
    ).toHaveLength(1);
  });

  it("passes attached photos to onSubmit alongside review data", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ReviewForm onSubmit={onSubmit} />);

    // Fill required ratings (3 star inputs + 1 difficulty/mountain input).
    screen
      .getAllByRole("button", { name: "5 stars" })
      .forEach((btn) => fireEvent.click(btn));
    fireEvent.click(screen.getByRole("button", { name: "5 mountains" }));

    // Fill required body.
    fireEvent.change(screen.getByLabelText(/your review/i), {
      target: { value: "Loved the trails" },
    });

    // Attach a photo.
    const file = makeFile("photo.jpg", "image/jpeg");
    fireEvent.change(getPhotoInput(container), { target: { files: [file] } });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    const submitted = onSubmit.mock.calls[0][0];
    expect(submitted.body).toBe("Loved the trails");
    expect(submitted.overallRating).toBe(5);
    expect(submitted.photos).toEqual([file]);
  });

  it("submits an empty photos array when none are attached (no-photo path unchanged)", async () => {
    const onSubmit = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(window, "alert").mockImplementation(() => {});

    const { container } = render(<ReviewForm onSubmit={onSubmit} />);

    screen
      .getAllByRole("button", { name: "5 stars" })
      .forEach((btn) => fireEvent.click(btn));
    fireEvent.click(screen.getByRole("button", { name: "5 mountains" }));
    fireEvent.change(screen.getByLabelText(/your review/i), {
      target: { value: "No photos" },
    });

    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });

    expect(onSubmit.mock.calls[0][0].photos).toEqual([]);
  });
});
