import { describe, it, expect } from "vitest";
import { isAlertActive, sortAlertsForDisplay } from "@/lib/park-alerts";
import type { ParkAlertSeverity } from "@prisma/client";

describe("isAlertActive", () => {
  const now = new Date("2026-04-21T12:00:00Z");

  it("returns false when isActive is false", () => {
    expect(
      isAlertActive({ isActive: false, startsAt: null, expiresAt: null }, now)
    ).toBe(false);
  });

  it("returns true when isActive with no dates", () => {
    expect(
      isAlertActive({ isActive: true, startsAt: null, expiresAt: null }, now)
    ).toBe(true);
  });

  it("returns false when startsAt is in the future", () => {
    expect(
      isAlertActive(
        {
          isActive: true,
          startsAt: new Date("2026-04-22T00:00:00Z"),
          expiresAt: null,
        },
        now
      )
    ).toBe(false);
  });

  it("returns true when startsAt is in the past", () => {
    expect(
      isAlertActive(
        {
          isActive: true,
          startsAt: new Date("2026-04-20T00:00:00Z"),
          expiresAt: null,
        },
        now
      )
    ).toBe(true);
  });

  it("returns false when expiresAt is in the past", () => {
    expect(
      isAlertActive(
        {
          isActive: true,
          startsAt: null,
          expiresAt: new Date("2026-04-20T00:00:00Z"),
        },
        now
      )
    ).toBe(false);
  });

  it("returns false when expiresAt exactly equals now (boundary)", () => {
    expect(
      isAlertActive({ isActive: true, startsAt: null, expiresAt: now }, now)
    ).toBe(false);
  });

  it("returns true when expiresAt is in the future", () => {
    expect(
      isAlertActive(
        {
          isActive: true,
          startsAt: null,
          expiresAt: new Date("2026-04-22T00:00:00Z"),
        },
        now
      )
    ).toBe(true);
  });
});

describe("sortAlertsForDisplay", () => {
  it("sorts by severity priority (DANGER > WARNING > INFO/SUCCESS) then createdAt desc", () => {
    const createdAtEarlier = new Date("2026-04-20T00:00:00Z");
    const createdAtLater = new Date("2026-04-21T00:00:00Z");

    const input: Array<{ id: string; severity: ParkAlertSeverity; createdAt: Date }> = [
      { id: "info-old", severity: "INFO", createdAt: createdAtEarlier },
      { id: "danger-old", severity: "DANGER", createdAt: createdAtEarlier },
      { id: "warning-new", severity: "WARNING", createdAt: createdAtLater },
      { id: "success-new", severity: "SUCCESS", createdAt: createdAtLater },
      { id: "info-new", severity: "INFO", createdAt: createdAtLater },
    ];

    const sorted = sortAlertsForDisplay(input);
    expect(sorted.map((a) => a.id)).toEqual([
      "danger-old",
      "warning-new",
      // INFO and SUCCESS tied on priority, resolve by createdAt desc
      "success-new",
      "info-new",
      "info-old",
    ]);
  });
});
