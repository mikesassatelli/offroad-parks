import { weatherIconKey } from "@/lib/weather/icons";
import { describe, expect, it } from "vitest";

describe("weatherIconKey", () => {
  it("returns 'sunny' for sunny / clear / fair conditions", () => {
    expect(weatherIconKey("Sunny")).toBe("sunny");
    expect(weatherIconKey("Clear")).toBe("sunny");
    expect(weatherIconKey("Fair")).toBe("sunny");
  });

  it("returns 'partlyCloudy' for partly conditions", () => {
    expect(weatherIconKey("Partly Sunny")).toBe("partlyCloudy");
    expect(weatherIconKey("Partly Cloudy")).toBe("partlyCloudy");
    expect(weatherIconKey("Mostly Cloudy")).toBe("partlyCloudy");
  });

  it("returns 'rain' for rain and showers", () => {
    expect(weatherIconKey("Rain")).toBe("rain");
    expect(weatherIconKey("Slight Chance Showers")).toBe("rain");
    expect(weatherIconKey("Heavy Rain")).toBe("rain");
  });

  it("returns 'snow' for snow conditions", () => {
    expect(weatherIconKey("Snow")).toBe("snow");
    expect(weatherIconKey("Snow Showers")).toBe("snow");
    expect(weatherIconKey("Blizzard")).toBe("snow");
  });

  it("returns 'thunderstorm' for thunderstorms", () => {
    expect(weatherIconKey("Thunderstorms")).toBe("thunderstorm");
    expect(weatherIconKey("Scattered Thunderstorms")).toBe("thunderstorm");
    expect(weatherIconKey("Lightning")).toBe("thunderstorm");
  });

  it("returns 'fog' for fog/haze/mist", () => {
    expect(weatherIconKey("Areas of Fog")).toBe("fog");
    expect(weatherIconKey("Haze")).toBe("fog");
  });

  it("returns 'wind' for windy conditions", () => {
    expect(weatherIconKey("Breezy")).toBe("wind");
    expect(weatherIconKey("Windy")).toBe("wind");
  });

  it("returns 'sleet' for freezing precipitation", () => {
    expect(weatherIconKey("Freezing Rain")).toBe("sleet");
    expect(weatherIconKey("Sleet")).toBe("sleet");
    expect(weatherIconKey("Ice Pellets")).toBe("sleet");
  });

  it("falls back to 'unknown' for null/empty/unknown", () => {
    expect(weatherIconKey(null)).toBe("unknown");
    expect(weatherIconKey(undefined)).toBe("unknown");
    expect(weatherIconKey("")).toBe("unknown");
    expect(weatherIconKey("Smoke and Volcanic Ash")).toBe("unknown");
  });

  it("is case-insensitive", () => {
    expect(weatherIconKey("SUNNY")).toBe("sunny");
    expect(weatherIconKey("rain")).toBe("rain");
  });

  it("prioritizes more-specific keywords over generic ones", () => {
    // "Partly Sunny" hits "partly" rule before "sunny" rule
    expect(weatherIconKey("Partly Sunny")).toBe("partlyCloudy");
    // "Snow Showers" hits "snow shower" rule, not "shower"
    expect(weatherIconKey("Snow Showers")).toBe("snow");
  });
});
