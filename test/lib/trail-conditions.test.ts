import { vi } from "vitest";
import {
  isConditionFresh,
  formatConditionAge,
  CONDITION_STALE_AFTER_MS,
  CONDITION_LABELS,
} from "@/lib/trail-conditions";

describe("isConditionFresh", () => {
  it("should return true for a condition reported just now", () => {
    expect(isConditionFresh(new Date().toISOString())).toBe(true);
  });

  it("should return true for a condition reported 1 hour ago", () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isConditionFresh(oneHourAgo)).toBe(true);
  });

  it("should return true for a condition reported 71 hours ago", () => {
    const almost72h = new Date(Date.now() - 71 * 60 * 60 * 1000).toISOString();
    expect(isConditionFresh(almost72h)).toBe(true);
  });

  it("should return false for a condition reported exactly 72 hours ago", () => {
    const exactly72h = new Date(Date.now() - CONDITION_STALE_AFTER_MS).toISOString();
    expect(isConditionFresh(exactly72h)).toBe(false);
  });

  it("should return false for a condition reported 4 days ago", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    expect(isConditionFresh(fourDaysAgo)).toBe(false);
  });

  it("should accept a Date object", () => {
    expect(isConditionFresh(new Date())).toBe(true);
  });
});

describe("formatConditionAge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return 'just now' for a condition less than 1 minute old", () => {
    const now = new Date("2026-01-15T12:00:00Z").toISOString();
    expect(formatConditionAge(now)).toBe("just now");
  });

  it("should return '1 minute ago' for a condition 1 minute old", () => {
    const oneMinAgo = new Date("2026-01-15T11:59:00Z").toISOString();
    expect(formatConditionAge(oneMinAgo)).toBe("1 minute ago");
  });

  it("should return '5 minutes ago' for a condition 5 minutes old", () => {
    const fiveMinsAgo = new Date("2026-01-15T11:55:00Z").toISOString();
    expect(formatConditionAge(fiveMinsAgo)).toBe("5 minutes ago");
  });

  it("should return '1 hour ago' for a condition 1 hour old", () => {
    const oneHourAgo = new Date("2026-01-15T11:00:00Z").toISOString();
    expect(formatConditionAge(oneHourAgo)).toBe("1 hour ago");
  });

  it("should return '3 hours ago' for a condition 3 hours old", () => {
    const threeHoursAgo = new Date("2026-01-15T09:00:00Z").toISOString();
    expect(formatConditionAge(threeHoursAgo)).toBe("3 hours ago");
  });

  it("should return '1 day ago' for a condition 1 day old", () => {
    const oneDayAgo = new Date("2026-01-14T12:00:00Z").toISOString();
    expect(formatConditionAge(oneDayAgo)).toBe("1 day ago");
  });

  it("should return '3 days ago' for a condition 3 days old", () => {
    const threeDaysAgo = new Date("2026-01-12T12:00:00Z").toISOString();
    expect(formatConditionAge(threeDaysAgo)).toBe("3 days ago");
  });
});

describe("CONDITION_LABELS", () => {
  it("should have labels for all 6 statuses", () => {
    const expected = ["OPEN", "CLOSED", "CAUTION", "MUDDY", "WET", "SNOW"];
    expect(Object.keys(CONDITION_LABELS)).toEqual(expect.arrayContaining(expected));
    expect(Object.keys(CONDITION_LABELS)).toHaveLength(6);
  });

  it("should have a label and color for each status", () => {
    for (const [, meta] of Object.entries(CONDITION_LABELS)) {
      expect(meta.label).toBeTruthy();
      expect(meta.color).toBeTruthy();
    }
  });
});
