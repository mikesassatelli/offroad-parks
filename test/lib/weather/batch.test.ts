import { getBatchRainProbabilities } from "@/lib/weather/batch";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Stub the nws-client module — batch.ts delegates to getForecast.
vi.mock("@/lib/weather/nws-client", () => ({
  getForecast: vi.fn(),
}));

import { getForecast } from "@/lib/weather/nws-client";
const mockGetForecast = vi.mocked(getForecast);

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getBatchRainProbabilities", () => {
  it("returns a Map keyed by parkId with today's precip probability", async () => {
    mockGetForecast
      .mockResolvedValueOnce(forecastWithRain(20))
      .mockResolvedValueOnce(forecastWithRain(80));

    const result = await getBatchRainProbabilities([
      { parkId: "p1", latitude: 39, longitude: -104 },
      { parkId: "p2", latitude: 40, longitude: -105 },
    ]);

    expect(result.get("p1")).toBe(20);
    expect(result.get("p2")).toBe(80);
  });

  it("maps parks without coordinates to null without calling getForecast", async () => {
    const result = await getBatchRainProbabilities([
      { parkId: "no-coords", latitude: null, longitude: null },
      { parkId: "no-lat", latitude: null, longitude: -104 },
      { parkId: "no-lng", latitude: 39, longitude: null },
    ]);

    expect(result.get("no-coords")).toBeNull();
    expect(result.get("no-lat")).toBeNull();
    expect(result.get("no-lng")).toBeNull();
    expect(mockGetForecast).not.toHaveBeenCalled();
  });

  it("maps parks whose forecast returned no precip probability to null", async () => {
    mockGetForecast.mockResolvedValueOnce(forecastWithRain(null));

    const result = await getBatchRainProbabilities([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toBeNull();
  });

  it("maps parks with empty forecast to null", async () => {
    mockGetForecast.mockResolvedValueOnce([]);

    const result = await getBatchRainProbabilities([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toBeNull();
  });

  it("maps parks whose getForecast call rejects to null (does not propagate)", async () => {
    mockGetForecast.mockRejectedValueOnce(new Error("nws 500"));

    const result = await getBatchRainProbabilities([
      { parkId: "p1", latitude: 39, longitude: -104 },
    ]);

    expect(result.get("p1")).toBeNull();
  });

  it("times out slow forecast calls to null", async () => {
    mockGetForecast.mockImplementation(
      () => new Promise(() => {
        // never resolves
      }),
    );

    const result = await getBatchRainProbabilities(
      [{ parkId: "slow", latitude: 39, longitude: -104 }],
      { timeoutMs: 25 },
    );

    expect(result.get("slow")).toBeNull();
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
    await getBatchRainProbabilities(parks, { concurrency: 3, timeoutMs: 5000 });

    expect(peakInFlight).toBeLessThanOrEqual(3);
  });

  it("returns a result for every input park (even when timeouts and errors mix)", async () => {
    mockGetForecast
      .mockResolvedValueOnce(forecastWithRain(40))
      .mockRejectedValueOnce(new Error("nws"))
      .mockResolvedValueOnce(forecastWithRain(70));

    const parks = [
      { parkId: "a", latitude: 39, longitude: -104 },
      { parkId: "b", latitude: 40, longitude: -105 },
      { parkId: "c", latitude: 41, longitude: -106 },
    ];
    const result = await getBatchRainProbabilities(parks, { concurrency: 1 });

    expect(result.size).toBe(3);
    expect(result.get("a")).toBe(40);
    expect(result.get("b")).toBeNull();
    expect(result.get("c")).toBe(70);
  });
});
