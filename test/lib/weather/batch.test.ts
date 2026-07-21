import { getBatchParkCardWeather } from "@/lib/weather/batch";
import type { WeatherAlert } from "@/lib/weather/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub the nws-client module — batch.ts delegates to getForecast + getActiveAlerts.
vi.mock("@/lib/weather/nws-client", () => ({
  getForecast: vi.fn(),
  getActiveAlerts: vi.fn(),
}));

import { getActiveAlerts, getForecast } from "@/lib/weather/nws-client";
const mockGetForecast = vi.mocked(getForecast);
const mockGetActiveAlerts = vi.mocked(getActiveAlerts);

function forecastWithRain(probability: number | null) {
  return [
    {
      date: "2026-05-12",
      dayName: "Mon",
      highF: 75,
      lowF: 52,
      precipProbability: probability,
      shortForecast: "Partly Sunny",
      iconCode: null,
    },
  ];
}

function alert(
  severity: WeatherAlert["severity"],
  id: string = severity,
): WeatherAlert {
  return {
    id,
    event: "Test Warning",
    severity,
    headline: null,
    description: "",
    effective: "2026-05-12T00:00:00Z",
    expires: null,
    urgency: "Expected",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no active alerts unless a test overrides.
  mockGetActiveAlerts.mockResolvedValue([]);
});

describe("getBatchParkCardWeather", () => {
  it("returns rain probability and no severe weather when there are no alerts", async () => {
    mockGetForecast
      .mockResolvedValueOnce(forecastWithRain(20))
      .mockResolvedValueOnce(forecastWithRain(80));

    const result = await getBatchParkCardWeather([
      { parkId: "p1", latitude: 39, longitude: -104 },
      { parkId: "p2", latitude: 40, longitude: -105 },
    ]);

    expect(result.get("p1")).toEqual({ rainChance: 20, severeWeather: null });
    expect(result.get("p2")).toEqual({ rainChance: 80, severeWeather: null });
  });

  it("summarizes only Severe/Extreme alerts, ignoring Minor/Moderate", async () => {
    mockGetForecast.mockResolvedValue(forecastWithRain(10));
    mockGetActiveAlerts.mockResolvedValueOnce([
      alert("Minor", "a"),
      alert("Severe", "b"),
      alert("Moderate", "c"),
    ]);

    const result = await getBatchParkCardWeather([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toEqual({
      rainChance: 10,
      severeWeather: { severity: "Severe", count: 1 },
    });
  });

  it("reports Extreme when any severe-plus alert is Extreme, counting all severe-plus", async () => {
    mockGetForecast.mockResolvedValue(forecastWithRain(null));
    mockGetActiveAlerts.mockResolvedValueOnce([
      alert("Severe", "a"),
      alert("Extreme", "b"),
    ]);

    const result = await getBatchParkCardWeather([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toEqual({
      rainChance: null,
      severeWeather: { severity: "Extreme", count: 2 },
    });
  });

  it("maps parks without coordinates to an empty summary without calling NWS", async () => {
    const result = await getBatchParkCardWeather([
      { parkId: "no-coords", latitude: null, longitude: null },
      { parkId: "no-lat", latitude: null, longitude: -104 },
      { parkId: "no-lng", latitude: 39, longitude: null },
    ]);

    expect(result.get("no-coords")).toEqual({
      rainChance: null,
      severeWeather: null,
    });
    expect(result.get("no-lat")).toEqual({
      rainChance: null,
      severeWeather: null,
    });
    expect(result.get("no-lng")).toEqual({
      rainChance: null,
      severeWeather: null,
    });
    expect(mockGetForecast).not.toHaveBeenCalled();
    expect(mockGetActiveAlerts).not.toHaveBeenCalled();
  });

  it("degrades a rejected forecast to null rain but still returns alerts", async () => {
    mockGetForecast.mockRejectedValueOnce(new Error("nws 500"));
    mockGetActiveAlerts.mockResolvedValueOnce([alert("Extreme")]);

    const result = await getBatchParkCardWeather([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toEqual({
      rainChance: null,
      severeWeather: { severity: "Extreme", count: 1 },
    });
  });

  it("degrades rejected alerts to null severeWeather but still returns rain", async () => {
    mockGetForecast.mockResolvedValueOnce(forecastWithRain(55));
    mockGetActiveAlerts.mockRejectedValueOnce(new Error("nws 500"));

    const result = await getBatchParkCardWeather([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toEqual({ rainChance: 55, severeWeather: null });
  });

  it("times out slow calls to an empty summary", async () => {
    mockGetForecast.mockImplementation(
      () =>
        new Promise(() => {
          // never resolves
        }),
    );

    const result = await getBatchParkCardWeather(
      [{ parkId: "slow", latitude: 39, longitude: -104 }],
      { timeoutMs: 25 },
    );

    expect(result.get("slow")).toEqual({ rainChance: null, severeWeather: null });
  });

  it("limits concurrency to the configured cap", async () => {
    let inFlight = 0;
    let peakInFlight = 0;
    mockGetForecast.mockImplementation(async () => {
      inFlight++;
      peakInFlight = Math.max(peakInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight--;
      return forecastWithRain(30);
    });

    const parks = Array.from({ length: 20 }, (_, i) => ({
      parkId: `p${i}`,
      latitude: 39,
      longitude: -104,
    }));
    await getBatchParkCardWeather(parks, { concurrency: 3, timeoutMs: 5000 });

    expect(peakInFlight).toBeLessThanOrEqual(3);
  });

  it("returns a result for every input park", async () => {
    mockGetForecast
      .mockResolvedValueOnce(forecastWithRain(40))
      .mockRejectedValueOnce(new Error("nws"))
      .mockResolvedValueOnce(forecastWithRain(70));

    const parks = [
      { parkId: "a", latitude: 39, longitude: -104 },
      { parkId: "b", latitude: 40, longitude: -105 },
      { parkId: "c", latitude: 41, longitude: -106 },
    ];
    const result = await getBatchParkCardWeather(parks, { concurrency: 1 });

    expect(result.size).toBe(3);
    expect(result.get("a")?.rainChance).toBe(40);
    expect(result.get("b")?.rainChance).toBeNull();
    expect(result.get("c")?.rainChance).toBe(70);
  });
});
