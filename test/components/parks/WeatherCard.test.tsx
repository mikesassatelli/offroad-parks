import { WeatherCard } from "@/components/parks/WeatherCard";
import type { CurrentConditions, DailyForecast } from "@/lib/weather/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

const CURRENT: CurrentConditions = {
  temperatureF: 72,
  feelsLikeF: 70,
  shortForecast: "Mostly Sunny",
  iconCode: null,
  observedAt: "2026-05-12T12:00:00Z",
};

const FORECAST: DailyForecast[] = [
  {
    date: "2026-05-12",
    dayName: "Mon",
    highF: 75,
    lowF: 52,
    precipProbability: 20,
    shortForecast: "Partly Sunny",
    iconCode: null,
  },
  {
    date: "2026-05-13",
    dayName: "Tue",
    highF: 70,
    lowF: 48,
    precipProbability: 60,
    shortForecast: "Rain",
    iconCode: null,
  },
];

describe("WeatherCard", () => {
  it("renders nothing when both current and forecast are empty", () => {
    const { container } = render(<WeatherCard current={null} forecast={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders current temperature and condition", () => {
    render(<WeatherCard current={CURRENT} forecast={[]} />);
    expect(screen.getByText("72°")).toBeInTheDocument();
    expect(screen.getByText("Mostly Sunny")).toBeInTheDocument();
  });

  it("hides feels-like when it equals the actual temperature", () => {
    const sameFeels: CurrentConditions = {
      ...CURRENT,
      temperatureF: 72,
      feelsLikeF: 72,
    };
    render(<WeatherCard current={sameFeels} forecast={[]} />);
    expect(screen.queryByText(/Feels/)).not.toBeInTheDocument();
  });

  it("shows feels-like when meaningfully different from actual", () => {
    const hot: CurrentConditions = {
      ...CURRENT,
      temperatureF: 95,
      feelsLikeF: 105,
    };
    render(<WeatherCard current={hot} forecast={[]} />);
    expect(screen.getByText(/Feels 105°/)).toBeInTheDocument();
  });

  it("renders 5-day forecast row when forecast data is present", () => {
    render(<WeatherCard current={null} forecast={FORECAST} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("75°")).toBeInTheDocument();
    expect(screen.getByText("/ 52°")).toBeInTheDocument();
  });

  it("shows precipitation probability badge only when >= 20%", () => {
    const lowAndHigh: DailyForecast[] = [
      {
        date: "2026-05-12",
        dayName: "Mon",
        highF: 75,
        lowF: 52,
        precipProbability: 10, // hidden
        shortForecast: "Sunny",
        iconCode: null,
      },
      {
        date: "2026-05-13",
        dayName: "Tue",
        highF: 70,
        lowF: 48,
        precipProbability: 60, // shown
        shortForecast: "Rain",
        iconCode: null,
      },
    ];
    render(<WeatherCard current={null} forecast={lowAndHigh} />);
    expect(screen.queryByText("10%")).not.toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders em-dash for missing hi/lo values", () => {
    const missing: DailyForecast[] = [
      {
        date: "2026-05-12",
        dayName: "Mon",
        highF: null,
        lowF: null,
        precipProbability: null,
        shortForecast: "Cloudy",
        iconCode: null,
      },
    ];
    render(<WeatherCard current={null} forecast={missing} />);
    expect(screen.getByText("—°")).toBeInTheDocument();
    expect(screen.getByText("/ —°")).toBeInTheDocument();
  });

  it("includes NWS attribution", () => {
    render(<WeatherCard current={CURRENT} forecast={FORECAST} />);
    expect(screen.getByText(/National Weather Service/)).toBeInTheDocument();
  });

  it("has data-testid for parent-component integration tests", () => {
    render(<WeatherCard current={CURRENT} forecast={FORECAST} />);
    expect(screen.getByTestId("weather-card")).toBeInTheDocument();
  });
});
