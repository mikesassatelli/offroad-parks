import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DifficultyBadge } from "@/components/reviews/DifficultyBadge";

describe("DifficultyBadge", () => {
  it("renders null when difficulty is not provided", () => {
    const { container } = render(<DifficultyBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null when difficulty is 0", () => {
    const { container } = render(<DifficultyBadge difficulty={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the formatted difficulty rating", () => {
    render(<DifficultyBadge difficulty={3.5} />);
    expect(screen.getByText("3.5")).toBeTruthy();
  });

  it("renders with small size class when size is sm", () => {
    const { container } = render(<DifficultyBadge difficulty={4} size="sm" />);
    expect(container.firstChild).toBeTruthy();
    expect(container.querySelector(".text-xs")).toBeTruthy();
  });

  it("renders with medium size class by default", () => {
    const { container } = render(<DifficultyBadge difficulty={4} />);
    expect(container.querySelector(".text-sm")).toBeTruthy();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DifficultyBadge difficulty={3} className="my-custom-class" />
    );
    expect(container.querySelector(".my-custom-class")).toBeTruthy();
  });
});
