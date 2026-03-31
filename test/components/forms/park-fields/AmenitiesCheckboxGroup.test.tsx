import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AmenitiesCheckboxGroup } from "@/components/forms/park-fields/AmenitiesCheckboxGroup";

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

describe("AmenitiesCheckboxGroup", () => {
  it("renders amenity options", () => {
    render(<AmenitiesCheckboxGroup value={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/restrooms/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/showers/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fuel/i)).toBeInTheDocument();
  });

  it("marks checked amenities", () => {
    render(<AmenitiesCheckboxGroup value={["restrooms", "fuel"]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/restrooms/i)).toBeChecked();
    expect(screen.getByLabelText(/fuel/i)).toBeChecked();
    expect(screen.getByLabelText(/showers/i)).not.toBeChecked();
  });

  it("adds amenity when unchecked item clicked", () => {
    const onChange = vi.fn();
    render(<AmenitiesCheckboxGroup value={["restrooms"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/fuel/i));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(["restrooms", "fuel"]));
  });

  it("removes amenity when checked item clicked", () => {
    const onChange = vi.fn();
    render(<AmenitiesCheckboxGroup value={["restrooms", "fuel"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/restrooms/i));
    const result = onChange.mock.calls[0][0];
    expect(result).not.toContain("restrooms");
    expect(result).toContain("fuel");
  });
});
