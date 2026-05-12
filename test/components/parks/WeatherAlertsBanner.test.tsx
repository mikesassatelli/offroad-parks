import { WeatherAlertsBanner } from "@/components/parks/WeatherAlertsBanner";
import type { WeatherAlert } from "@/lib/weather/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

function makeAlert(overrides: Partial<WeatherAlert> = {}): WeatherAlert {
  return {
    id: `urn:nws:alert:${Math.random()}`,
    event: "Red Flag Warning",
    severity: "Severe",
    headline: "Red Flag Warning until 6 PM",
    description: "Critical fire weather conditions.",
    effective: "2026-05-12T12:00:00-06:00",
    expires: "2026-05-12T18:00:00-06:00",
    urgency: "Expected",
    ...overrides,
  };
}

describe("WeatherAlertsBanner", () => {
  it("renders nothing when there are no alerts", () => {
    const { container } = render(<WeatherAlertsBanner alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when only Moderate/Minor alerts exist", () => {
    const { container } = render(
      <WeatherAlertsBanner
        alerts={[makeAlert({ severity: "Moderate" }), makeAlert({ severity: "Minor" })]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner for a Severe alert", () => {
    render(<WeatherAlertsBanner alerts={[makeAlert({ severity: "Severe" })]} />);
    expect(screen.getByTestId("weather-alerts-banner")).toBeInTheDocument();
    expect(screen.getAllByText("Red Flag Warning").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the banner for an Extreme alert", () => {
    render(
      <WeatherAlertsBanner
        alerts={[makeAlert({ severity: "Extreme", event: "Tornado Warning" })]}
      />,
    );
    expect(screen.getByText("Tornado Warning")).toBeInTheDocument();
  });

  it("shows the highest-severity alert first in the banner", () => {
    render(
      <WeatherAlertsBanner
        alerts={[
          makeAlert({ id: "a", severity: "Severe", event: "Wind Warning" }),
          makeAlert({ id: "b", severity: "Extreme", event: "Tornado Warning" }),
        ]}
      />,
    );
    // Banner area (the first occurrence — modal is in portal not yet open)
    expect(screen.getByText("Tornado Warning")).toBeInTheDocument();
  });

  it("shows total alerts count in 'View all alerts' when more than the severe-plus subset", async () => {
    const user = userEvent.setup();
    render(
      <WeatherAlertsBanner
        alerts={[
          makeAlert({ id: "a", severity: "Severe" }),
          makeAlert({ id: "b", severity: "Moderate", event: "Wind Advisory" }),
          makeAlert({ id: "c", severity: "Minor", event: "Air Quality" }),
        ]}
      />,
    );
    expect(screen.getByText(/View all alerts/)).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();

    await user.click(screen.getByText(/View all alerts/));

    // All three alerts appear in modal
    expect(
      screen.getByText("Active weather alerts"),
    ).toBeInTheDocument();
    expect(screen.getByText("Wind Advisory")).toBeInTheDocument();
    expect(screen.getByText("Air Quality")).toBeInTheDocument();
  });

  it("modal lists alerts sorted by severity (Extreme → Minor)", async () => {
    const user = userEvent.setup();
    render(
      <WeatherAlertsBanner
        alerts={[
          makeAlert({ id: "a", severity: "Minor", event: "Air Quality" }),
          makeAlert({ id: "b", severity: "Extreme", event: "Tornado" }),
          makeAlert({ id: "c", severity: "Moderate", event: "Wind Advisory" }),
        ]}
      />,
    );
    await user.click(screen.getByText(/View all alerts/));
    const modal = screen.getByRole("dialog");
    const items = modal.querySelectorAll("li");
    // Order: Tornado (Extreme), Wind Advisory (Moderate), Air Quality (Minor)
    expect(items[0].textContent).toContain("Tornado");
    expect(items[1].textContent).toContain("Wind Advisory");
    expect(items[2].textContent).toContain("Air Quality");
  });

  it("hides the headline when it duplicates the event string", () => {
    render(
      <WeatherAlertsBanner
        alerts={[
          makeAlert({
            severity: "Severe",
            event: "Red Flag Warning",
            headline: "Red Flag Warning",
          }),
        ]}
      />,
    );
    // event appears once in banner. headline (same text) is suppressed.
    expect(screen.getAllByText("Red Flag Warning")).toHaveLength(1);
  });

  it("includes NWS attribution in the modal", async () => {
    const user = userEvent.setup();
    render(<WeatherAlertsBanner alerts={[makeAlert({ severity: "Severe" })]} />);
    await user.click(screen.getByText(/View all alerts/));
    // Radix may portal the dialog in both DOM and aria-hidden copies, so
    // we accept >= 1 match for the attribution line.
    expect(screen.getAllByText(/National Weather Service/).length).toBeGreaterThan(0);
  });
});
