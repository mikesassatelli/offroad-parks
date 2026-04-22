import type { ParkAlertSeverity } from "@prisma/client";

export const PARK_ALERT_SEVERITIES: ParkAlertSeverity[] = [
  "INFO",
  "WARNING",
  "DANGER",
  "SUCCESS",
];

/**
 * Priority ordering for alert stacking — higher value surfaces first.
 * DANGER > WARNING > INFO/SUCCESS (equal).
 */
export const SEVERITY_PRIORITY: Record<ParkAlertSeverity, number> = {
  DANGER: 3,
  WARNING: 2,
  INFO: 1,
  SUCCESS: 1,
};

export interface ActiveAlertLike {
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
}

/**
 * Returns true when the alert is currently active:
 *   isActive = true
 *   AND (startsAt IS NULL OR startsAt <= now)
 *   AND (expiresAt IS NULL OR expiresAt > now)
 */
export function isAlertActive(
  alert: ActiveAlertLike,
  now: Date = new Date()
): boolean {
  if (!alert.isActive) return false;
  if (alert.startsAt && alert.startsAt > now) return false;
  if (alert.expiresAt && alert.expiresAt <= now) return false;
  return true;
}

export interface AlertSortable {
  severity: ParkAlertSeverity;
  createdAt: Date | string;
}

/**
 * Sort alerts by severity priority (desc) then createdAt (desc).
 */
export function sortAlertsForDisplay<T extends AlertSortable>(alerts: T[]): T[] {
  return [...alerts].sort((a, b) => {
    const pDiff = SEVERITY_PRIORITY[b.severity] - SEVERITY_PRIORITY[a.severity];
    if (pDiff !== 0) return pDiff;
    const bDate = new Date(b.createdAt).getTime();
    const aDate = new Date(a.createdAt).getTime();
    return bDate - aDate;
  });
}
