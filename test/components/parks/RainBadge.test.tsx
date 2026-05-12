import { RainBadge } from "@/components/parks/RainBadge";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("RainBadge", () => {
  it("renders nothing when probability is null", () => {
    const { container } = render(<RainBadge probability={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when probability is undefined", () => {
    const { container } = render(<RainBadge probability={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the probability value with a percent sign", () => {
    render(<RainBadge probability={45} />);
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("renders 0% (edge case — explicit dry forecast)", () => {
    render(<RainBadge probability={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("uses green styling for low probability (< 20%)", () => {
    render(<RainBadge probability={10} />);
    const badge = screen.getByTestId("rain-badge");
    expect(badge.className).toMatch(/bg-green-/);
    expect(badge.className).not.toMatch(/bg-amber-/);
    expect(badge.className).not.toMatch(/bg-red-/);
  });

  it("uses amber styling for moderate probability (20–60%)", () => {
    render(<RainBadge probability={40} />);
    const badge = screen.getByTestId("rain-badge");
    expect(badge.className).toMatch(/bg-amber-/);
    expect(badge.className).not.toMatch(/bg-green-/);
    expect(badge.className).not.toMatch(/bg-red-/);
  });

  it("uses red styling for high probability (> 60%)", () => {
    render(<RainBadge probability={75} />);
    const badge = screen.getByTestId("rain-badge");
    expect(badge.className).toMatch(/bg-red-/);
    expect(badge.className).not.toMatch(/bg-green-/);
    expect(badge.className).not.toMatch(/bg-amber-/);
  });

  it("uses amber at the exact 20% boundary", () => {
    render(<RainBadge probability={20} />);
    expect(screen.getByTestId("rain-badge").className).toMatch(/bg-amber-/);
  });

  it("uses amber at the exact 60% boundary", () => {
    render(<RainBadge probability={60} />);
    expect(screen.getByTestId("rain-badge").className).toMatch(/bg-amber-/);
  });

  it("uses red just above the 60% boundary", () => {
    render(<RainBadge probability={61} />);
    expect(screen.getByTestId("rain-badge").className).toMatch(/bg-red-/);
  });

  it("provides an accessible label and title with the probability", () => {
    render(<RainBadge probability={45} />);
    const badge = screen.getByTestId("rain-badge");
    expect(badge).toHaveAttribute("aria-label", "45% chance of rain today");
    expect(badge).toHaveAttribute("title", "45% chance of rain today");
  });
});
