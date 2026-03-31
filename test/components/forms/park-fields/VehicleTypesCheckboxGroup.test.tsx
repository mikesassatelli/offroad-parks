import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { VehicleTypesCheckboxGroup } from "@/components/forms/park-fields/VehicleTypesCheckboxGroup";

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

describe("VehicleTypesCheckboxGroup", () => {
  it("renders all vehicle types with display labels", () => {
    render(<VehicleTypesCheckboxGroup value={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/motorcycle/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/atv/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sxs/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/full-size/i)).toBeInTheDocument();
  });

  it("marks checked vehicle types", () => {
    render(<VehicleTypesCheckboxGroup value={["atv", "motorcycle"]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/atv/i)).toBeChecked();
    expect(screen.getByLabelText(/motorcycle/i)).toBeChecked();
    expect(screen.getByLabelText(/sxs/i)).not.toBeChecked();
  });

  it("adds vehicle type when clicked", () => {
    const onChange = vi.fn();
    render(<VehicleTypesCheckboxGroup value={["atv"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/motorcycle/i));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(["atv", "motorcycle"]));
  });

  it("removes vehicle type when checked item clicked", () => {
    const onChange = vi.fn();
    render(<VehicleTypesCheckboxGroup value={["atv", "motorcycle"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/atv/i));
    const result = onChange.mock.calls[0][0];
    expect(result).not.toContain("atv");
    expect(result).toContain("motorcycle");
  });
});
