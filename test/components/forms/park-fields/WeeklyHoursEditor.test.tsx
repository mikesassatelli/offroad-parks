import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WeeklyHoursEditor } from "@/components/forms/park-fields/WeeklyHoursEditor";
import { emptyWeeklyHours, type WeeklyHours } from "@/lib/hours";

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

vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

describe("WeeklyHoursEditor", () => {
  it("renders a row for all seven days", () => {
    render(<WeeklyHoursEditor value={emptyWeeklyHours()} onChange={vi.fn()} />);
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]) {
      expect(screen.getByText(day)).toBeInTheDocument();
      expect(screen.getByLabelText(`${day} opening time`)).toBeInTheDocument();
      expect(screen.getByLabelText(`${day} closing time`)).toBeInTheDocument();
      expect(screen.getByLabelText(`${day} closed`)).toBeInTheDocument();
    }
  });

  it("handles a null/undefined value by rendering an empty grid", () => {
    render(<WeeklyHoursEditor value={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Monday opening time")).toHaveValue("");
  });

  it("emits an open/close window when times are entered", () => {
    const onChange = vi.fn();
    render(<WeeklyHoursEditor value={emptyWeeklyHours()} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Monday opening time"), {
      target: { value: "08:00" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mon: { open: "08:00", close: "" } }),
    );
  });

  it("preserves the other time when one is edited", () => {
    const value: WeeklyHours = {
      ...emptyWeeklyHours(),
      mon: { open: "08:00", close: "" },
    };
    const onChange = vi.fn();
    render(<WeeklyHoursEditor value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Monday closing time"), {
      target: { value: "18:00" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mon: { open: "08:00", close: "18:00" } }),
    );
  });

  it("clears a day back to null when both times are emptied", () => {
    const value: WeeklyHours = {
      ...emptyWeeklyHours(),
      mon: { open: "08:00", close: "" },
    };
    const onChange = vi.fn();
    render(<WeeklyHoursEditor value={value} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Monday opening time"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mon: null }),
    );
  });

  it("marks a day closed when the Closed toggle is checked", () => {
    const onChange = vi.fn();
    render(<WeeklyHoursEditor value={emptyWeeklyHours()} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Saturday closed"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sat: { closed: true } }),
    );
  });

  it("clears the closed flag back to null when unchecked", () => {
    const value: WeeklyHours = { ...emptyWeeklyHours(), sat: { closed: true } };
    const onChange = vi.fn();
    render(<WeeklyHoursEditor value={value} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Saturday closed"));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sat: null }),
    );
  });

  it("disables the time inputs for a closed day", () => {
    const value: WeeklyHours = { ...emptyWeeklyHours(), sat: { closed: true } };
    render(<WeeklyHoursEditor value={value} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Saturday opening time")).toBeDisabled();
    expect(screen.getByLabelText("Saturday closing time")).toBeDisabled();
  });
});
