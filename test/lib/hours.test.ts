import { describe, it, expect } from "vitest";
import {
  DAY_KEYS,
  weeklyHoursSchema,
  emptyWeeklyHours,
  parseWeeklyHours,
  hasAnyHours,
  isClosed,
  isOpenWindow,
  formatTime,
  formatDayHours,
  formatWeeklyHours,
  toOpeningHoursSpecification,
  type WeeklyHours,
} from "@/lib/hours";

const fullWeek = (): WeeklyHours => ({
  mon: { open: "08:00", close: "18:00" },
  tue: { open: "08:00", close: "18:00" },
  wed: { open: "08:00", close: "18:00" },
  thu: { open: "08:00", close: "18:00" },
  fri: { open: "08:00", close: "18:00" },
  sat: { closed: true },
  sun: null,
});

describe("hours: constants", () => {
  it("orders days Monday-first", () => {
    expect(DAY_KEYS).toEqual(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  });
});

describe("weeklyHoursSchema", () => {
  it("accepts an all-null (empty) schedule", () => {
    expect(weeklyHoursSchema.safeParse(emptyWeeklyHours()).success).toBe(true);
  });

  it("accepts open windows, closed days, and null", () => {
    expect(weeklyHoursSchema.safeParse(fullWeek()).success).toBe(true);
  });

  it("rejects non-HH:MM time strings", () => {
    const bad = { ...emptyWeeklyHours(), mon: { open: "8am", close: "18:00" } };
    const result = weeklyHoursSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it("rejects 24:00 and other out-of-range times", () => {
    const bad = { ...emptyWeeklyHours(), mon: { open: "24:00", close: "25:00" } };
    expect(weeklyHoursSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a window where close is not after open", () => {
    const bad = { ...emptyWeeklyHours(), mon: { open: "18:00", close: "08:00" } };
    const result = weeklyHoursSchema.safeParse(bad);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/before closing/i);
    }
  });

  it("rejects equal open and close times", () => {
    const bad = { ...emptyWeeklyHours(), mon: { open: "08:00", close: "08:00" } };
    expect(weeklyHoursSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects extra keys on a day object", () => {
    const bad = {
      ...emptyWeeklyHours(),
      mon: { open: "08:00", close: "18:00", note: "x" },
    };
    expect(weeklyHoursSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects closed:false (only closed:true is valid)", () => {
    const bad = { ...emptyWeeklyHours(), mon: { closed: false } };
    expect(weeklyHoursSchema.safeParse(bad).success).toBe(false);
  });

  it("requires all seven day keys", () => {
    const bad = { mon: null };
    expect(weeklyHoursSchema.safeParse(bad).success).toBe(false);
  });
});

describe("parseWeeklyHours", () => {
  it("returns the parsed schedule for valid input", () => {
    expect(parseWeeklyHours(fullWeek())).toEqual(fullWeek());
  });

  it("returns null for invalid or non-object input", () => {
    expect(parseWeeklyHours(null)).toBeNull();
    expect(parseWeeklyHours("nope")).toBeNull();
    expect(parseWeeklyHours({ mon: { open: "bad" } })).toBeNull();
  });
});

describe("hasAnyHours", () => {
  it("is false for null/undefined and all-null schedules", () => {
    expect(hasAnyHours(null)).toBe(false);
    expect(hasAnyHours(undefined)).toBe(false);
    expect(hasAnyHours(emptyWeeklyHours())).toBe(false);
  });

  it("is true when at least one day is specified (open or closed)", () => {
    expect(hasAnyHours({ ...emptyWeeklyHours(), sat: { closed: true } })).toBe(true);
    expect(
      hasAnyHours({ ...emptyWeeklyHours(), mon: { open: "09:00", close: "17:00" } }),
    ).toBe(true);
  });
});

describe("type guards", () => {
  it("isClosed only matches { closed: true }", () => {
    expect(isClosed({ closed: true })).toBe(true);
    expect(isClosed(null)).toBe(false);
    expect(isClosed({ open: "08:00", close: "18:00" })).toBe(false);
  });

  it("isOpenWindow only matches open/close windows", () => {
    expect(isOpenWindow({ open: "08:00", close: "18:00" })).toBe(true);
    expect(isOpenWindow({ closed: true })).toBe(false);
    expect(isOpenWindow(null)).toBe(false);
  });
});

describe("formatTime", () => {
  it("converts 24h to 12h with AM/PM", () => {
    expect(formatTime("08:00")).toBe("8:00 AM");
    expect(formatTime("13:30")).toBe("1:30 PM");
    expect(formatTime("00:00")).toBe("12:00 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("23:45")).toBe("11:45 PM");
  });
});

describe("formatDayHours", () => {
  it("formats an open window, closed, and unspecified", () => {
    expect(formatDayHours({ open: "08:00", close: "18:00" })).toBe(
      "8:00 AM – 6:00 PM",
    );
    expect(formatDayHours({ closed: true })).toBe("Closed");
    expect(formatDayHours(null)).toBe("");
    expect(formatDayHours(undefined)).toBe("");
  });
});

describe("formatWeeklyHours", () => {
  it("groups consecutive days with identical hours", () => {
    const groups = formatWeeklyHours(fullWeek());
    expect(groups).toEqual([
      { label: "Mon – Fri", hours: "8:00 AM – 6:00 PM" },
      { label: "Sat", hours: "Closed" },
    ]);
  });

  it("omits unspecified days and breaks runs across them", () => {
    const hours: WeeklyHours = {
      ...emptyWeeklyHours(),
      mon: { open: "09:00", close: "17:00" },
      wed: { open: "09:00", close: "17:00" },
    };
    const groups = formatWeeklyHours(hours);
    // Tue (null) breaks the run so Mon and Wed are separate single-day groups.
    expect(groups).toEqual([
      { label: "Mon", hours: "9:00 AM – 5:00 PM" },
      { label: "Wed", hours: "9:00 AM – 5:00 PM" },
    ]);
  });

  it("returns an empty list for null/empty schedules", () => {
    expect(formatWeeklyHours(null)).toEqual([]);
    expect(formatWeeklyHours(emptyWeeklyHours())).toEqual([]);
  });
});

describe("toOpeningHoursSpecification", () => {
  it("emits a spec only for open days, using schema.org day URLs", () => {
    const specs = toOpeningHoursSpecification(fullWeek());
    expect(specs).toHaveLength(5);
    expect(specs[0]).toEqual({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: "https://schema.org/Monday",
      opens: "08:00",
      closes: "18:00",
    });
    // No spec for the closed Saturday or unspecified Sunday.
    const days = specs.map((s) => s.dayOfWeek);
    expect(days).not.toContain("https://schema.org/Saturday");
    expect(days).not.toContain("https://schema.org/Sunday");
  });

  it("returns an empty array for null/empty schedules", () => {
    expect(toOpeningHoursSpecification(null)).toEqual([]);
    expect(toOpeningHoursSpecification(emptyWeeklyHours())).toEqual([]);
  });
});
