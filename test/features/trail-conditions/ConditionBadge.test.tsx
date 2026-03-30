import { render, screen } from "@testing-library/react";
import { ConditionBadge } from "@/features/trail-conditions/ConditionBadge";
import type { TrailConditionStatus } from "@/lib/trail-conditions";

describe("ConditionBadge", () => {
  it("should render OPEN status badge with correct label", () => {
    render(<ConditionBadge status="OPEN" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("should render CLOSED status badge with correct label", () => {
    render(<ConditionBadge status="CLOSED" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("should render CAUTION status badge with correct label", () => {
    render(<ConditionBadge status="CAUTION" />);
    expect(screen.getByText("Caution")).toBeInTheDocument();
  });

  it("should render MUDDY status badge with correct label", () => {
    render(<ConditionBadge status="MUDDY" />);
    expect(screen.getByText("Muddy")).toBeInTheDocument();
  });

  it("should render WET status badge with correct label", () => {
    render(<ConditionBadge status="WET" />);
    expect(screen.getByText("Wet")).toBeInTheDocument();
  });

  it("should render SNOW status badge with correct label", () => {
    render(<ConditionBadge status="SNOW" />);
    expect(screen.getByText("Snow")).toBeInTheDocument();
  });

  it("should apply sm size classes by default", () => {
    const { container } = render(<ConditionBadge status="OPEN" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-xs");
    expect(span?.className).toContain("px-2");
  });

  it("should apply xs size classes when size=xs", () => {
    const { container } = render(<ConditionBadge status="OPEN" size="xs" />);
    const span = container.querySelector("span");
    expect(span?.className).toContain("text-[10px]");
    expect(span?.className).toContain("px-1.5");
  });

  it("should render all status types without errors", () => {
    const statuses: TrailConditionStatus[] = ["OPEN", "CLOSED", "CAUTION", "MUDDY", "WET", "SNOW"];
    statuses.forEach((status) => {
      const { container } = render(<ConditionBadge status={status} />);
      expect(container.querySelector("span")).toBeInTheDocument();
    });
  });
});
