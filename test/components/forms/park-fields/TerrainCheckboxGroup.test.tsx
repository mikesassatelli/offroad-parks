import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { TerrainCheckboxGroup } from "@/components/forms/park-fields/TerrainCheckboxGroup";

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

describe("TerrainCheckboxGroup", () => {
  it("renders all terrain types", () => {
    render(<TerrainCheckboxGroup value={[]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/sand/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rocks/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/mud/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/trails/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hills/i)).toBeInTheDocument();
  });

  it("marks checked items as checked", () => {
    render(<TerrainCheckboxGroup value={["sand", "mud"]} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/sand/i)).toBeChecked();
    expect(screen.getByLabelText(/mud/i)).toBeChecked();
    expect(screen.getByLabelText(/rocks/i)).not.toBeChecked();
  });

  it("calls onChange with added item when unchecked item is clicked", () => {
    const onChange = vi.fn();
    render(<TerrainCheckboxGroup value={["sand"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/mud/i));
    expect(onChange).toHaveBeenCalledWith(expect.arrayContaining(["sand", "mud"]));
  });

  it("calls onChange with item removed when checked item is clicked", () => {
    const onChange = vi.fn();
    render(<TerrainCheckboxGroup value={["sand", "mud"]} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/sand/i));
    const result = onChange.mock.calls[0][0];
    expect(result).not.toContain("sand");
    expect(result).toContain("mud");
  });

  it("starts with all unchecked when value is empty", () => {
    render(<TerrainCheckboxGroup value={[]} onChange={vi.fn()} />);
    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((cb) => expect(cb).not.toBeChecked());
  });
});
