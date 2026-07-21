import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ParkAlertBadges } from "@/components/parks/ParkAlertBadges";
import type { ParkCardAlertSummary } from "@/lib/types";

function summary(
  overrides: Partial<ParkCardAlertSummary> = {},
): ParkCardAlertSummary {
  return { officialClosure: null, severeWeather: null, ...overrides };
}

describe("ParkAlertBadges", () => {
  it("renders nothing when there is no summary", () => {
    const { container } = render(<ParkAlertBadges summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when neither closure nor weather is present", () => {
    const { container } = render(<ParkAlertBadges summary={summary()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a 'Closed' badge for a DANGER official closure", () => {
    render(
      <ParkAlertBadges
        summary={summary({
          officialClosure: { severity: "DANGER", count: 1 },
        })}
      />,
    );
    expect(screen.getByTestId("closure-badge")).toHaveTextContent("Closed");
    expect(screen.queryByTestId("weather-badge")).not.toBeInTheDocument();
  });

  it("shows a 'Limited' badge for a WARNING official closure", () => {
    render(
      <ParkAlertBadges
        summary={summary({
          officialClosure: { severity: "WARNING", count: 1 },
        })}
      />,
    );
    expect(screen.getByTestId("closure-badge")).toHaveTextContent("Limited");
  });

  it("shows the alert title, with a +N suffix when >1 severe alert", () => {
    render(
      <ParkAlertBadges
        summary={summary({
          severeWeather: {
            severity: "Extreme",
            event: "Extreme Heat Warning",
            count: 3,
          },
        })}
      />,
    );
    const badge = screen.getByTestId("weather-badge");
    expect(badge).toHaveTextContent("Extreme Heat Warning");
    expect(badge).toHaveTextContent("+2");
    expect(badge).toHaveAttribute(
      "aria-label",
      "Extreme Heat Warning — 3 active extreme weather alerts",
    );
  });

  it("shows just the title (no suffix) for a single alert", () => {
    render(
      <ParkAlertBadges
        summary={summary({
          severeWeather: {
            severity: "Severe",
            event: "Severe Thunderstorm Warning",
            count: 1,
          },
        })}
      />,
    );
    const badge = screen.getByTestId("weather-badge");
    expect(badge).toHaveTextContent("Severe Thunderstorm Warning");
    expect(badge.textContent).not.toContain("+");
  });

  it("renders both badges together, closure first", () => {
    render(
      <ParkAlertBadges
        summary={summary({
          officialClosure: { severity: "DANGER", count: 1 },
          severeWeather: {
            severity: "Severe",
            event: "Severe Thunderstorm Warning",
            count: 1,
          },
        })}
      />,
    );
    const group = screen.getByTestId("park-alert-badges");
    const testids = Array.from(group.querySelectorAll("[data-testid]")).map(
      (el) => el.getAttribute("data-testid"),
    );
    expect(testids).toEqual(["closure-badge", "weather-badge"]);
  });
});
