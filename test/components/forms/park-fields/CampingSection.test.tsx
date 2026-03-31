import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CampingSection } from "@/components/forms/park-fields/CampingSection";

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, ...props }: any) => (
    <label htmlFor={htmlFor} {...props}>{children}</label>
  ),
}));

const defaultProps = {
  value: [],
  onChange: vi.fn(),
  campingWebsite: "",
  onCampingWebsiteChange: vi.fn(),
  campingPhone: "",
  onCampingPhoneChange: vi.fn(),
};

describe("CampingSection", () => {
  it("renders camping type options", () => {
    render(<CampingSection {...defaultProps} />);
    expect(screen.getByLabelText(/tent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cabin/i)).toBeInTheDocument();
  });

  it("does not show reservation fields when no camping selected", () => {
    render(<CampingSection {...defaultProps} value={[]} />);
    expect(screen.queryByPlaceholderText(/reservations/i)).not.toBeInTheDocument();
  });

  it("shows reservation fields when camping types are selected", () => {
    render(<CampingSection {...defaultProps} value={["tent"]} />);
    expect(screen.getByPlaceholderText(/reservations/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/camping website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/camping phone/i)).toBeInTheDocument();
  });

  it("marks selected camping types as checked", () => {
    render(<CampingSection {...defaultProps} value={["tent", "cabin"]} />);
    expect(screen.getByLabelText(/tent/i)).toBeChecked();
    expect(screen.getByLabelText(/cabin/i)).toBeChecked();
  });

  it("adds camping type when clicked", () => {
    const onChange = vi.fn();
    render(<CampingSection {...defaultProps} value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/tent/i));
    expect(onChange).toHaveBeenCalledWith(["tent"]);
  });

  it("removes camping type when checked item is clicked", () => {
    const onChange = vi.fn();
    render(<CampingSection {...defaultProps} value={["tent", "cabin"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/tent/i));
    const result = onChange.mock.calls[0][0];
    expect(result).not.toContain("tent");
    expect(result).toContain("cabin");
  });

  it("calls onCampingWebsiteChange when website input changes", () => {
    const onCampingWebsiteChange = vi.fn();
    render(
      <CampingSection
        {...defaultProps}
        value={["tent"]}
        campingWebsite="https://example.com"
        onCampingWebsiteChange={onCampingWebsiteChange}
      />
    );
    const input = screen.getByLabelText(/camping website/i);
    fireEvent.change(input, { target: { value: "https://new.com" } });
    expect(onCampingWebsiteChange).toHaveBeenCalledWith("https://new.com");
  });
});
