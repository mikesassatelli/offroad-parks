/**
 * Severe-weather banner on the park detail page (OP-54). Renders only when
 * at least one active NWS alert is Severe or Extreme. The banner shows the
 * highest-priority alert inline; "View all alerts" opens a modal listing
 * every active alert at the coord (including Moderate/Minor advisories).
 *
 * Out of scope: triggering park closures. Closures are operator-controlled
 * (OP-65), never auto-driven from weather data.
 */
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { AlertSeverity, WeatherAlert } from "@/lib/weather/types";
import { AlertOctagon, AlertTriangle, ExternalLink, Info } from "lucide-react";
import { useState } from "react";

// Severity sort order — Extreme first, Unknown last.
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  Extreme: 0,
  Severe: 1,
  Moderate: 2,
  Minor: 3,
  Unknown: 4,
};

const SEVERE_PLUS: ReadonlySet<AlertSeverity> = new Set(["Extreme", "Severe"]);

const SEVERITY_CLASSES: Record<
  AlertSeverity,
  { container: string; icon: string; pill: string }
> = {
  Extreme: {
    container:
      "bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-100",
    icon: "text-red-700 dark:text-red-300",
    pill: "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",
  },
  Severe: {
    container:
      "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
    pill: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
  },
  Moderate: {
    container:
      "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  },
  Minor: {
    container:
      "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    pill: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  },
  Unknown: {
    container:
      "bg-muted border-border text-foreground",
    icon: "text-muted-foreground",
    pill: "bg-muted text-muted-foreground",
  },
};

const SEVERITY_ICON: Record<AlertSeverity, typeof Info> = {
  Extreme: AlertOctagon,
  Severe: AlertOctagon,
  Moderate: AlertTriangle,
  Minor: Info,
  Unknown: Info,
};

interface WeatherAlertsBannerProps {
  alerts: WeatherAlert[];
}

function sortBySeverity(alerts: WeatherAlert[]): WeatherAlert[] {
  return [...alerts].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
}

function formatExpires(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Compact local-time formatting — "until 6pm Tue" reads more naturally
  // than the raw ISO string. Day name only when not today.
  const now = new Date();
  const today =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: d.getMinutes() === 0 ? undefined : "2-digit",
  });
  if (today) return `until ${time}`;
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  return `until ${time} ${day}`;
}

export function WeatherAlertsBanner({ alerts }: WeatherAlertsBannerProps) {
  const [open, setOpen] = useState(false);

  if (alerts.length === 0) return null;
  const sorted = sortBySeverity(alerts);
  const severePlus = sorted.filter((a) => SEVERE_PLUS.has(a.severity));
  if (severePlus.length === 0) return null;

  const top = severePlus[0];
  const topClasses = SEVERITY_CLASSES[top.severity];
  const TopIcon = SEVERITY_ICON[top.severity];
  const expiresText = formatExpires(top.expires);

  return (
    <div
      role="region"
      aria-label="Weather alerts"
      data-testid="weather-alerts-banner"
    >
      <div
        className={`border rounded-md px-4 py-3 flex items-start gap-3 ${topClasses.container}`}
        role="alert"
      >
        <TopIcon
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${topClasses.icon}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {top.event}
            {expiresText && (
              <span className="font-normal text-sm/normal opacity-80">
                {" "}
                · {expiresText}
              </span>
            )}
          </p>
          {top.headline && top.headline !== top.event && (
            <p className="text-sm mt-0.5">{top.headline}</p>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="text-sm font-medium underline-offset-2 hover:underline mt-1 inline-flex items-center gap-1"
              >
                View all alerts
                {alerts.length > severePlus.length && (
                  <span className="opacity-70">({alerts.length})</span>
                )}
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Active weather alerts</DialogTitle>
                <DialogDescription>
                  {alerts.length} active{" "}
                  {alerts.length === 1 ? "alert" : "alerts"} from the National
                  Weather Service for this park&apos;s location.
                </DialogDescription>
              </DialogHeader>
              <ul className="space-y-3">
                {sorted.map((alert) => {
                  const classes = SEVERITY_CLASSES[alert.severity];
                  const Icon = SEVERITY_ICON[alert.severity];
                  const expires = formatExpires(alert.expires);
                  return (
                    <li
                      key={alert.id}
                      className={`border rounded-md px-4 py-3 ${classes.container}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${classes.icon}`}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="font-semibold text-sm">
                              {alert.event}
                            </p>
                            <span
                              className={`text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 ${classes.pill}`}
                            >
                              {alert.severity}
                            </span>
                            {expires && (
                              <span className="text-xs opacity-80">
                                {expires}
                              </span>
                            )}
                          </div>
                          {alert.headline && (
                            <p className="text-sm mt-1 font-medium">
                              {alert.headline}
                            </p>
                          )}
                          <p className="text-xs mt-2 whitespace-pre-wrap leading-relaxed">
                            {alert.description}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[10px] text-muted-foreground pt-2">
                Source: National Weather Service
              </p>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
