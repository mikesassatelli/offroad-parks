import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RequirementsSection } from "@/components/forms/park-fields/RequirementsSection";
import type { RequirementsValues } from "@/components/forms/park-fields/RequirementsSection";

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

const defaultValues: RequirementsValues = {
  permitRequired: false,
  permitType: "",
  membershipRequired: false,
  flagsRequired: false,
  sparkArrestorRequired: false,
  helmetsRequired: false,
  maxVehicleWidthInches: "",
  noiseLimitDBA: "",
};

describe("RequirementsSection", () => {
  it("renders requirement checkboxes", () => {
    render(<RequirementsSection values={defaultValues} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/permit required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/membership required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/whip flags required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/spark arrestor required/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/helmets required/i)).toBeInTheDocument();
  });

  it("hides permit type input when permit not required", () => {
    render(<RequirementsSection values={defaultValues} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/permit type/i)).not.toBeInTheDocument();
  });

  it("shows permit type input when permit is required", () => {
    render(
      <RequirementsSection
        values={{ ...defaultValues, permitRequired: true }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText(/permit type/i)).toBeInTheDocument();
  });

  it("calls onChange with correct field and value when checkbox clicked", () => {
    const onChange = vi.fn();
    render(<RequirementsSection values={defaultValues} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/membership required/i));
    expect(onChange).toHaveBeenCalledWith("membershipRequired", true);
  });

  it("calls onChange for flagsRequired when clicked", () => {
    const onChange = vi.fn();
    render(<RequirementsSection values={defaultValues} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/whip flags required/i));
    expect(onChange).toHaveBeenCalledWith("flagsRequired", true);
  });

  it("renders max vehicle width input with current value", () => {
    render(
      <RequirementsSection
        values={{ ...defaultValues, maxVehicleWidthInches: "65" }}
        onChange={vi.fn()}
      />
    );
    const input = screen.getByLabelText(/max vehicle width/i);
    expect((input as HTMLInputElement).value).toBe("65");
  });

  it("calls onChange with noiseLimitDBA when noise input changes", () => {
    const onChange = vi.fn();
    render(<RequirementsSection values={defaultValues} onChange={onChange} />);
    const input = screen.getByLabelText(/noise limit/i);
    fireEvent.change(input, { target: { value: "96" } });
    expect(onChange).toHaveBeenCalledWith("noiseLimitDBA", "96");
  });

  it("reflects checked state correctly for all boolean fields", () => {
    const allChecked: RequirementsValues = {
      permitRequired: true,
      permitType: "OHV sticker",
      membershipRequired: true,
      flagsRequired: true,
      sparkArrestorRequired: true,
      helmetsRequired: true,
      maxVehicleWidthInches: "60",
      noiseLimitDBA: "96",
    };
    render(<RequirementsSection values={allChecked} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/permit required/i)).toBeChecked();
    expect(screen.getByLabelText(/membership required/i)).toBeChecked();
    expect(screen.getByLabelText(/whip flags required/i)).toBeChecked();
    expect(screen.getByLabelText(/spark arrestor required/i)).toBeChecked();
    expect(screen.getByLabelText(/helmets required/i)).toBeChecked();
  });
});
