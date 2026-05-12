import {
  getActiveAlerts,
  getCurrentConditions,
  getForecast,
  getOrResolveGrid,
  getParkWeather,
} from "@/lib/weather/nws-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

// NWS client uses global fetch with `next: { revalidate, tags }`. In test we
// just stub fetch to return whatever payload we want.
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

const PARK_ID = "park-test";
const LAT = 39.7392;
const LNG = -104.9903; // Denver-ish

const POINTS_RESPONSE = {
  properties: {
    gridId: "BOU",
    gridX: 62,
    gridY: 61,
    forecast: "https://api.weather.gov/gridpoints/BOU/62,61/forecast",
    forecastHourly: "https://api.weather.gov/gridpoints/BOU/62,61/forecast/hourly",
    observationStations: "https://api.weather.gov/gridpoints/BOU/62,61/stations",
    relativeLocation: {
      properties: {
        city: "Denver",
        state: "CO",
      },
    },
  },
};

const FORECAST_RESPONSE = {
  properties: {
    periods: [
      {
        name: "Today",
        startTime: "2026-05-12T06:00:00-06:00",
        endTime: "2026-05-12T18:00:00-06:00",
        isDaytime: true,
        temperature: 75,
        temperatureUnit: "F",
        probabilityOfPrecipitation: { value: 20 },
        shortForecast: "Partly Sunny",
        icon: "https://api.weather.gov/icons/land/day/sct?size=medium",
      },
      {
        name: "Tonight",
        startTime: "2026-05-12T18:00:00-06:00",
        endTime: "2026-05-13T06:00:00-06:00",
        isDaytime: false,
        temperature: 52,
        temperatureUnit: "F",
        probabilityOfPrecipitation: { value: 40 },
        shortForecast: "Chance Showers",
        icon: "https://api.weather.gov/icons/land/night/rain,40?size=medium",
      },
      {
        name: "Wednesday",
        startTime: "2026-05-13T06:00:00-06:00",
        endTime: "2026-05-13T18:00:00-06:00",
        isDaytime: true,
        temperature: 70,
        temperatureUnit: "F",
        probabilityOfPrecipitation: { value: 60 },
        shortForecast: "Rain",
        icon: "https://api.weather.gov/icons/land/day/rain?size=medium",
      },
      {
        name: "Wednesday Night",
        startTime: "2026-05-13T18:00:00-06:00",
        endTime: "2026-05-14T06:00:00-06:00",
        isDaytime: false,
        temperature: 48,
        temperatureUnit: "F",
        probabilityOfPrecipitation: { value: null },
        shortForecast: "Cloudy",
        icon: null,
      },
    ],
  },
};

const STATIONS_RESPONSE = {
  features: [
    { id: "https://api.weather.gov/stations/KDEN", properties: { stationIdentifier: "KDEN" } },
    { id: "https://api.weather.gov/stations/KAPA", properties: { stationIdentifier: "KAPA" } },
  ],
};

const OBSERVATION_RESPONSE = {
  properties: {
    timestamp: "2026-05-12T12:00:00+00:00",
    textDescription: "Mostly Sunny",
    icon: "https://api.weather.gov/icons/land/day/sct?size=medium",
    temperature: { unitCode: "wmoUnit:degC", value: 22.2 }, // ~72°F
    windChill: { unitCode: "wmoUnit:degC", value: null },
    heatIndex: { unitCode: "wmoUnit:degC", value: null },
  },
};

const ALERTS_RESPONSE = {
  features: [
    {
      properties: {
        id: "urn:nws:alert:123",
        event: "Red Flag Warning",
        severity: "Severe",
        headline: "Red Flag Warning until 6 PM MDT",
        description: "Critical fire weather conditions.",
        effective: "2026-05-12T12:00:00-06:00",
        expires: "2026-05-12T18:00:00-06:00",
        urgency: "Expected",
      },
    },
    {
      properties: {
        id: "urn:nws:alert:124",
        event: "Wind Advisory",
        severity: "Moderate",
        headline: "Wind Advisory",
        description: "Windy.",
        effective: "2026-05-12T12:00:00-06:00",
        expires: null,
        urgency: "Expected",
      },
    },
  ],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOrResolveGrid", () => {
  it("returns grid info from /points", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE));

    const grid = await getOrResolveGrid(PARK_ID, LAT, LNG);

    expect(grid).toEqual({
      office: "BOU",
      gridX: 62,
      gridY: 61,
      forecastUrl: POINTS_RESPONSE.properties.forecast,
      forecastHourlyUrl: POINTS_RESPONSE.properties.forecastHourly,
      stationsUrl: POINTS_RESPONSE.properties.observationStations,
      city: "Denver",
      state: "CO",
    });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/points/39.7392,-104.9903");
  });

  it("sends the NWS-required User-Agent header", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE));
    await getOrResolveGrid(PARK_ID, LAT, LNG);
    const init = fetchMock.mock.calls[0][1] as RequestInit & { next?: unknown };
    const headers = init.headers as Record<string, string>;
    expect(headers["User-Agent"]).toMatch(/offroad-parks/);
    expect(headers["Accept"]).toBe("application/geo+json");
  });

  it("uses indefinite revalidation and a park-scoped tag for grid lookups", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE));
    await getOrResolveGrid(PARK_ID, LAT, LNG);
    const init = fetchMock.mock.calls[0][1] as RequestInit & {
      next?: { revalidate: number | false; tags: string[] };
    };
    expect(init.next?.revalidate).toBe(false);
    expect(init.next?.tags).toEqual([`park:${PARK_ID}:weather`]);
  });

  it("returns null on NWS error status", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));
    const grid = await getOrResolveGrid(PARK_ID, LAT, LNG);
    expect(grid).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const grid = await getOrResolveGrid(PARK_ID, LAT, LNG);
    expect(grid).toBeNull();
  });

  it("rounds coords to 4 decimal places for cache-key reuse", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE));
    await getOrResolveGrid(PARK_ID, 39.73928374, -104.99031234);
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/points/39.7393,-104.9903");
  });
});

describe("getForecast", () => {
  it("returns a folded 5-day forecast with hi/lo per day", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE));

    const forecast = await getForecast(PARK_ID, LAT, LNG);

    expect(forecast).toHaveLength(2);
    const day1 = forecast[0];
    expect(day1.date).toBe("2026-05-12");
    expect(day1.highF).toBe(75);
    expect(day1.lowF).toBe(52);
    expect(day1.precipProbability).toBe(40); // max of 20 + 40
    expect(day1.shortForecast).toBe("Partly Sunny");

    const day2 = forecast[1];
    expect(day2.date).toBe("2026-05-13");
    expect(day2.highF).toBe(70);
    expect(day2.lowF).toBe(48);
    expect(day2.precipProbability).toBe(60); // null treated as missing
  });

  it("uses 6h revalidation on the forecast call", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(FORECAST_RESPONSE));
    await getForecast(PARK_ID, LAT, LNG);
    const init = fetchMock.mock.calls[1][1] as { next: { revalidate: number } };
    expect(init.next.revalidate).toBe(6 * 60 * 60);
  });

  it("returns [] when grid resolution fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 404));
    const forecast = await getForecast(PARK_ID, LAT, LNG);
    expect(forecast).toEqual([]);
  });

  it("returns [] when forecast fetch fails", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({}, false, 500));
    const forecast = await getForecast(PARK_ID, LAT, LNG);
    expect(forecast).toEqual([]);
  });

  it("caps at 5 days even with longer NWS response", async () => {
    const periods = Array.from({ length: 14 }, (_, i) => ({
      name: `Period ${i}`,
      startTime: `2026-05-${String(12 + Math.floor(i / 2)).padStart(2, "0")}T${i % 2 === 0 ? "06" : "18"}:00:00-06:00`,
      endTime: "2026-05-13T18:00:00-06:00",
      isDaytime: i % 2 === 0,
      temperature: 70 - i,
      temperatureUnit: "F",
      probabilityOfPrecipitation: { value: 10 },
      shortForecast: "Sunny",
      icon: "x",
    }));
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({ properties: { periods } }));
    const forecast = await getForecast(PARK_ID, LAT, LNG);
    expect(forecast.length).toBeLessThanOrEqual(5);
  });
});

describe("getCurrentConditions", () => {
  it("converts Celsius observations to Fahrenheit", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(STATIONS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(OBSERVATION_RESPONSE));

    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current).not.toBeNull();
    expect(current!.temperatureF).toBe(72); // 22.2C -> 72F
    expect(current!.shortForecast).toBe("Mostly Sunny");
    expect(current!.observedAt).toBe("2026-05-12T12:00:00+00:00");
  });

  it("uses provided Fahrenheit values without re-conversion", async () => {
    const fObs = {
      ...OBSERVATION_RESPONSE,
      properties: {
        ...OBSERVATION_RESPONSE.properties,
        temperature: { unitCode: "unit:degF", value: 68 },
      },
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(STATIONS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(fObs));
    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current!.temperatureF).toBe(68);
  });

  it("returns feels-like as heat index when available, else wind chill", async () => {
    const obsWithHeat = {
      ...OBSERVATION_RESPONSE,
      properties: {
        ...OBSERVATION_RESPONSE.properties,
        heatIndex: { unitCode: "wmoUnit:degC", value: 35 }, // 95F
        windChill: { unitCode: "wmoUnit:degC", value: null },
      },
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(STATIONS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(obsWithHeat));
    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current!.feelsLikeF).toBe(95);
  });

  it("falls through to next station when first returns null temperature", async () => {
    const nullObs = {
      ...OBSERVATION_RESPONSE,
      properties: {
        ...OBSERVATION_RESPONSE.properties,
        temperature: { unitCode: "wmoUnit:degC", value: null },
      },
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(STATIONS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse(nullObs))
      .mockResolvedValueOnce(jsonResponse(OBSERVATION_RESPONSE));
    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current).not.toBeNull();
    expect(current!.temperatureF).toBe(72);
  });

  it("returns null when no stations are available", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(POINTS_RESPONSE))
      .mockResolvedValueOnce(jsonResponse({ features: [] }));
    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current).toBeNull();
  });

  it("returns null when grid resolution fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 404));
    const current = await getCurrentConditions(PARK_ID, LAT, LNG);
    expect(current).toBeNull();
  });
});

describe("getActiveAlerts", () => {
  it("normalizes alerts and preserves severity ordering", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ALERTS_RESPONSE));
    const alerts = await getActiveAlerts(PARK_ID, LAT, LNG);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].event).toBe("Red Flag Warning");
    expect(alerts[0].severity).toBe("Severe");
    expect(alerts[1].severity).toBe("Moderate");
  });

  it("normalizes unknown severity values to 'Unknown'", async () => {
    const weird = {
      features: [
        {
          properties: {
            ...ALERTS_RESPONSE.features[0].properties,
            severity: "Catastrophic", // not a valid NWS severity
          },
        },
      ],
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(weird));
    const alerts = await getActiveAlerts(PARK_ID, LAT, LNG);
    expect(alerts[0].severity).toBe("Unknown");
  });

  it("uses 10min revalidation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(ALERTS_RESPONSE));
    await getActiveAlerts(PARK_ID, LAT, LNG);
    const init = fetchMock.mock.calls[0][1] as { next: { revalidate: number } };
    expect(init.next.revalidate).toBe(10 * 60);
  });

  it("returns [] on fetch failure", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500));
    const alerts = await getActiveAlerts(PARK_ID, LAT, LNG);
    expect(alerts).toEqual([]);
  });
});

describe("getParkWeather", () => {
  it("fetches all three surfaces and returns a combined object", async () => {
    // current path: points, stations, observation
    // forecast path: points (cached), forecast
    // alerts path: alerts (no points dep)
    // Parallel call order via Promise.all is not guaranteed; mock 6 fetches
    // and identify by URL pattern.
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/points/")) return Promise.resolve(jsonResponse(POINTS_RESPONSE));
      if (url.includes("/stations") && !url.includes("/observations"))
        return Promise.resolve(jsonResponse(STATIONS_RESPONSE));
      if (url.includes("/observations/latest"))
        return Promise.resolve(jsonResponse(OBSERVATION_RESPONSE));
      if (url.includes("/forecast")) return Promise.resolve(jsonResponse(FORECAST_RESPONSE));
      if (url.includes("/alerts/active")) return Promise.resolve(jsonResponse(ALERTS_RESPONSE));
      return Promise.resolve(jsonResponse({}, false, 404));
    });

    const weather = await getParkWeather(PARK_ID, LAT, LNG);

    expect(weather.current).not.toBeNull();
    expect(weather.current!.temperatureF).toBe(72);
    expect(weather.forecast.length).toBeGreaterThan(0);
    expect(weather.alerts).toHaveLength(2);
  });

  it("degrades gracefully when all calls fail", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, false, 500));
    const weather = await getParkWeather(PARK_ID, LAT, LNG);
    expect(weather.current).toBeNull();
    expect(weather.forecast).toEqual([]);
    expect(weather.alerts).toEqual([]);
  });
});
