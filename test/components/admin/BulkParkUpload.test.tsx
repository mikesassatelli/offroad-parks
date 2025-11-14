import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BulkParkUpload } from "@/components/admin/BulkParkUpload";
import { vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("BulkParkUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the component with all sections", () => {
      render(<BulkParkUpload />);

      expect(
        screen.getByRole("heading", { name: /bulk upload parks/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/download csv template/i)).toBeInTheDocument();
      expect(screen.getByText(/format guide/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/upload file/i)).toBeInTheDocument();
    });

    it("should disable upload button initially", () => {
      render(<BulkParkUpload />);

      const uploadButton = screen.getByRole("button", {
        name: /upload 0 parks/i,
      });
      expect(uploadButton).toBeDisabled();
    });
  });

  describe("CSV File Upload", () => {
    it("should parse and display CSV file with valid data", async () => {
      const user = userEvent.setup();
      render(<BulkParkUpload />);

      const csvContent = `name,state,terrain,difficulty
Test Park 1,Utah,sand,easy
Test Park 2,Colorado,"rocks,trails","moderate,difficult"`;

      const file = new File([csvContent], "parks.csv", { type: "text/csv" });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(
          screen.getByText(/loaded 2 parks from csv/i)
        ).toBeInTheDocument();
        expect(screen.getByText("Test Park 1")).toBeInTheDocument();
        expect(screen.getByText("Test Park 2")).toBeInTheDocument();
      });
    });

    it("should show error for invalid file type", async () => {
      render(<BulkParkUpload />);

      const file = new File(["content"], "parks.txt", { type: "text/plain" });
      const fileInput = screen.getByLabelText(/upload file/i) as HTMLInputElement;

      // Use fireEvent instead of userEvent for file inputs
      Object.defineProperty(fileInput, 'files', {
        value: [file],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(
          screen.getByText(/invalid file type/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe("JSON File Upload", () => {
    it("should parse and display JSON file with valid data", async () => {
      const user = userEvent.setup();
      render(<BulkParkUpload />);

      const jsonContent = JSON.stringify([
        {
          name: "Test Park 1",
          state: "Utah",
          terrain: ["sand"],
          difficulty: ["easy"],
        },
        {
          name: "Test Park 2",
          state: "Colorado",
          terrain: ["rocks", "trails"],
          difficulty: ["moderate", "difficult"],
        },
      ]);

      const file = new File([jsonContent], "parks.json", {
        type: "application/json",
      });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(
          screen.getByText(/loaded 2 parks from json/i)
        ).toBeInTheDocument();
        expect(screen.getByText("Test Park 1")).toBeInTheDocument();
        expect(screen.getByText("Test Park 2")).toBeInTheDocument();
      });
    });
  });

  describe("Form Submission", () => {
    it("should submit parks to API on upload button click", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          created: 2,
          errors: [],
        }),
      });

      render(<BulkParkUpload />);

      const csvContent = `name,state,terrain,difficulty
Test Park 1,Utah,sand,easy
Test Park 2,Colorado,rocks,moderate`;

      const file = new File([csvContent], "parks.csv", { type: "text/csv" });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/loaded 2 parks/i)).toBeInTheDocument();
      });

      // Wait for the button to appear with the correct text after file parsing
      const uploadButton = await screen.findByRole("button", {
        name: /upload 2 parks/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/admin/parks/bulk-upload",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
        );
      });
    });

    it("should show success message after successful upload", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          created: 1,
          errors: [],
        }),
      });

      render(<BulkParkUpload />);

      const csvContent = `name,state,terrain,difficulty
Test Park,Utah,sand,easy`;

      const file = new File([csvContent], "parks.csv", { type: "text/csv" });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      // Wait for the button to appear with the correct text after file parsing
      const uploadButton = await screen.findByRole("button", {
        name: /upload 1 park/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload successful/i)).toBeInTheDocument();
        expect(
          screen.getByText(/successfully created 1 park/i)
        ).toBeInTheDocument();
      });
    });

    it("should display validation errors from API", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          created: 0,
          errors: [
            { row: 1, field: "name", message: "Name is required" },
            { row: 2, field: "state", message: "Invalid state" },
          ],
        }),
      });

      render(<BulkParkUpload />);

      const csvContent = `name,state,terrain,difficulty
,Utah,sand,easy
Test Park,ZZ,rocks,moderate`;

      const file = new File([csvContent], "parks.csv", { type: "text/csv" });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      // Wait for the button to appear with the correct text after file parsing
      const uploadButton = await screen.findByRole("button", {
        name: /upload 2 parks/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(
          screen.getByText(/validation errors \(2\)/i)
        ).toBeInTheDocument();
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
        expect(screen.getByText(/invalid state/i)).toBeInTheDocument();
      });
    });
  });

  describe("Reset Functionality", () => {
    it("should reset form when reset button is clicked", async () => {
      const user = userEvent.setup();
      render(<BulkParkUpload />);

      const csvContent = `name,state,terrain,difficulty
Test Park,Utah,sand,easy`;

      const file = new File([csvContent], "parks.csv", { type: "text/csv" });
      const fileInput = screen.getByLabelText(/upload file/i);

      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/loaded 1 park/i)).toBeInTheDocument();
      });

      const resetButton = screen.getByRole("button", { name: /reset/i });
      await user.click(resetButton);

      await waitFor(() => {
        expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/loaded 1 park/i)).not.toBeInTheDocument();
      });
    });
  });
});
