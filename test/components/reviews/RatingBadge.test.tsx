import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RatingBadge } from "@/components/reviews/RatingBadge";

describe("RatingBadge", () => {
  it("should display the rating value", () => {
    render(<RatingBadge rating={4.5} />);

    expect(screen.getByText("4.5")).toBeTruthy();
  });

  it("should display review count when provided", () => {
    render(<RatingBadge rating={4.5} reviewCount={10} />);

    expect(screen.getByText("4.5")).toBeTruthy();
    expect(screen.getByText("(10)")).toBeTruthy();
  });

  it("should format rating to single decimal place", () => {
    render(<RatingBadge rating={4.567} />);

    expect(screen.getByText("4.6")).toBeTruthy();
  });

  it("should show 'No reviews yet' when rating is undefined", () => {
    render(<RatingBadge rating={undefined} />);

    expect(screen.getByText("No reviews yet")).toBeTruthy();
  });

  it("should show 'No reviews yet' when rating is null", () => {
    render(<RatingBadge rating={null as any} />);

    expect(screen.getByText("No reviews yet")).toBeTruthy();
  });

  it("should apply small size classes", () => {
    const { container } = render(<RatingBadge rating={4.5} size="sm" />);

    expect(container.querySelector(".text-xs")).toBeTruthy();
  });

  it("should apply default size classes", () => {
    const { container } = render(<RatingBadge rating={4.5} />);

    expect(container.querySelector(".text-sm")).toBeTruthy();
  });
});
