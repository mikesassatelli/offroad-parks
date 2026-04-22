"use client";

import { useEffect, useState } from "react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import type { ParkAlertSeverity } from "@prisma/client";

const SEVERITY_CLASSES: Record<
  ParkAlertSeverity,
  { container: string; icon: string; title: string }
> = {
  INFO: {
    container:
      "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-100",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-900 dark:text-blue-100",
  },
  SUCCESS: {
    container:
      "bg-green-50 border-green-200 text-green-900 dark:bg-green-950/40 dark:border-green-900 dark:text-green-100",
    icon: "text-green-600 dark:text-green-400",
    title: "text-green-900 dark:text-green-100",
  },
  WARNING: {
    container:
      "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-100",
    icon: "text-amber-600 dark:text-amber-400",
    title: "text-amber-900 dark:text-amber-100",
  },
  DANGER: {
    container:
      "bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-100",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-900 dark:text-red-100",
  },
};

const SEVERITY_ICON: Record<ParkAlertSeverity, typeof Info> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  DANGER: AlertOctagon,
};

export interface ParkAlertDisplay {
  id: string;
  title: string;
  body: string | null;
  severity: ParkAlertSeverity;
  createdAt: string | Date;
}

export const ALERT_DISMISS_KEY_PREFIX = "park-alert-dismissed:";

interface ParkAlertsBannerProps {
  alerts: ParkAlertDisplay[];
}

function readDismissedFromStorage(ids: readonly string[]): Set<string> {
  const result = new Set<string>();
  if (typeof window === "undefined") return result;
  try {
    for (const id of ids) {
      if (window.localStorage.getItem(ALERT_DISMISS_KEY_PREFIX + id) === "1") {
        result.add(id);
      }
    }
  } catch {
    // localStorage unavailable — treat nothing as dismissed.
  }
  return result;
}

export function ParkAlertsBanner({ alerts }: ParkAlertsBannerProps) {
  // Two pieces of state:
  //   - `dismissedIds` is the authoritative set of dismissed alert ids for this
  //     render. Starts empty on SSR/first render so the server and client
  //     markup match (no hydration mismatch). On mount we load persisted ids
  //     from localStorage in a single effect — this is the standard React
  //     pattern for rehydrating persisted client-only state.
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set<string>()
  );

  // Re-read dismissal state from localStorage when the alert id set changes.
  // This setState is the React-prescribed way to rehydrate persisted state
  // after mount — suppressing the lint rule for this narrow case.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissedIds(readDismissedFromStorage(alerts.map((a) => a.id)));
  }, [alerts]);

  const dismiss = (id: string) => {
    try {
      window.localStorage.setItem(ALERT_DISMISS_KEY_PREFIX + id, "1");
    } catch {
      // ignore
    }
    setDismissedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  if (alerts.length === 0) return null;

  const visible = alerts.filter((a) => !dismissedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" role="region" aria-label="Park alerts">
      {visible.map((alert) => {
        const classes = SEVERITY_CLASSES[alert.severity];
        const Icon = SEVERITY_ICON[alert.severity];
        return (
          <div
            key={alert.id}
            data-testid={`park-alert-${alert.id}`}
            className={`border rounded-md px-4 py-3 flex items-start gap-3 ${classes.container}`}
            role="alert"
          >
            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${classes.icon}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${classes.title}`}>{alert.title}</p>
              {alert.body && (
                <p className="text-sm mt-1 whitespace-pre-wrap">{alert.body}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(alert.id)}
              className="flex-shrink-0 rounded p-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
