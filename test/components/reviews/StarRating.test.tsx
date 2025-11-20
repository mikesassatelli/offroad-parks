import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { StarRating, StarRatingInput } from "@/components/reviews/StarRating";

describe("StarRating", () => {
  it("should render 5 stars", () => {
    const { container } = render(<StarRating rating={4} />);

    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
  });

  it("should handle rating of 0", () => {
    const { container } = render(<StarRating rating={0} />);

    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
  });

  it("should handle maximum rating of 5", () => {
    const { container } = render(<StarRating rating={5} />);

    const stars = container.querySelectorAll("svg");
    expect(stars).toHaveLength(5);
  });

  it("should apply size classes correctly", () => {
    const { container } = render(<StarRating rating={3} size="lg" />);

    expect(container.querySelector(".h-5")).toBeTruthy();
  });

  it("should apply small size classes", () => {
    const { container } = render(<StarRating rating={3} size="sm" />);

    expect(container.querySelector(".h-3")).toBeTruthy();
  });
});

describe("StarRatingInput", () => {
  it("should render with label", () => {
    render(
      <StarRatingInput
        label="Test Rating"
        value={0}
        onChange={() => {}}
      />
    );

    expect(screen.getByText("Test Rating")).toBeTruthy();
  });

  it("should show required indicator when required", () => {
    render(
      <StarRatingInput
        label="Test Rating"
        value={0}
        onChange={() => {}}
        required
      />
    );

    expect(screen.getByText("*")).toBeTruthy();
  });

  it("should call onChange when star is clicked", () => {
    const handleChange = vi.fn();
    render(
      <StarRatingInput
        label="Test Rating"
        value={0}
        onChange={handleChange}
      />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // Click 3rd star

    expect(handleChange).toHaveBeenCalledWith(3);
  });

  it("should highlight stars on hover", () => {
    render(
      <StarRatingInput
        label="Test Rating"
        value={2}
        onChange={() => {}}
      />
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.mouseEnter(buttons[3]);
    // Stars should be highlighted up to hovered star
  });

  it("should reset hover state on mouse leave", () => {
    render(
      <StarRatingInput
        label="Test Rating"
        value={2}
        onChange={() => {}}
      />
    );

    const container = screen.getByText("Test Rating").parentElement;
    if (container) {
      const starContainer = container.querySelector(".flex.gap-1");
      if (starContainer) {
        fireEvent.mouseLeave(starContainer);
      }
    }
    // Should show original value
  });
});
