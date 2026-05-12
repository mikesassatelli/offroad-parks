/**
 * Weather widget on the park detail sidebar (OP-53). Presentational only —
 * data is fetched server-side in src/app/parks/[id]/page.tsx via the lib
 * in src/lib/weather and handed in via props.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { weatherIconKey, type WeatherIconKey } from "@/lib/weather/icons";
import type { CurrentConditions, DailyForecast } from "@/lib/weather/types";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Snowflake,
  Sun,
  Wind,
  type LucideIcon,
} from "lucide-react";

const WEATHER_ICON: Record<WeatherIconKey, LucideIcon> = {
  thunderstorm: CloudLightning,
  hail: CloudHail,
  snow: CloudSnow,
  sleet: Snowflake,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  fog: CloudFog,
  wind: Wind,
  partlyCloudy: CloudSun,
  cloudy: Cloud,
  sunny: Sun,
  unknown: Cloud,
};

interface WeatherCardProps {
  current: CurrentConditions | null;
  forecast: DailyForecast[];
}

export function WeatherCard({ current, forecast }: WeatherCardProps) {
  // Hide entirely when both surfaces are empty — better than rendering a
  // card that just says "Weather unavailable" on every park without
  // observations. Most parks have a forecast even when current obs are null.
  if (!current && forecast.length === 0) {
    return null;
  }

  const CurrentIcon = WEATHER_ICON[weatherIconKey(current?.shortForecast)];

  return (
    <Card data-testid="weather-card">
      <CardHeader>
        <CardTitle className="text-base">Weather</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {current && (
          <div className="flex items-center gap-4">
            <CurrentIcon
              className="w-12 h-12 text-primary flex-shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums">
                  {current.temperatureF != null
                    ? `${Math.round(current.temperatureF)}°`
                    : "—"}
                </span>
                {current.feelsLikeF != null &&
                  Math.round(current.feelsLikeF) !==
                    Math.round(current.temperatureF ?? 0) && (
                    <span className="text-xs text-muted-foreground">
                      Feels {Math.round(current.feelsLikeF)}°
                    </span>
                  )}
              </div>
              <p className="text-sm text-card-foreground/80 truncate">
                {current.shortForecast || "Current conditions"}
              </p>
            </div>
          </div>
        )}

        {forecast.length > 0 && (
          <div
            className="grid grid-cols-5 gap-1 pt-2 border-t border-border"
            role="list"
            aria-label="5-day forecast"
          >
            {forecast.map((day) => {
              const DayIcon = WEATHER_ICON[weatherIconKey(day.shortForecast)];
              return (
                <div
                  key={day.date}
                  role="listitem"
                  className="flex flex-col items-center text-center gap-1 py-1"
                >
                  <span className="text-xs font-medium text-card-foreground/80">
                    {day.dayName}
                  </span>
                  <DayIcon
                    className="w-5 h-5 text-card-foreground/70"
                    aria-hidden="true"
                  />
                  <span className="text-xs tabular-nums">
                    <span className="font-semibold">
                      {day.highF != null ? Math.round(day.highF) : "—"}°
                    </span>
                    <span className="text-muted-foreground">
                      {" / "}
                      {day.lowF != null ? Math.round(day.lowF) : "—"}°
                    </span>
                  </span>
                  {day.precipProbability != null &&
                    day.precipProbability >= 20 && (
                      <span
                        className="text-[10px] inline-flex items-center gap-0.5 text-blue-700 dark:text-blue-300"
                        aria-label={`${day.precipProbability}% precipitation`}
                      >
                        <Droplets className="w-2.5 h-2.5" aria-hidden="true" />
                        {day.precipProbability}%
                      </span>
                    )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground pt-1">
          Source: National Weather Service
        </p>
      </CardContent>
    </Card>
  );
}
