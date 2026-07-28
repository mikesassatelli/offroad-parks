/**
 * Structured weekly opening hours (display-only).
 *
 * A park's hours are stored as a JSON blob of 7 day keys (mon..sun), each of
 * which is one of:
 *   - `{ open: "HH:MM", close: "HH:MM" }` — open during that window (24h times)
 *   - `{ closed: true }`                  — explicitly closed that day
 *   - `null`                              — unknown / unspecified
 *
 * This is a pure display feature: no "open now" computation, no timezone, and
 * no discovery filtering. The free-text `Park.datesOpen` field remains the
 * "season notes" alongside this structured schedule.
 */
import { z } from "zod";

/** Ordered day keys (Monday-first) used throughout the app. */
export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export type DayKey = (typeof DAY_KEYS)[number];

/** Short labels for compact rows/grouping (e.g. "Mon"). */
export const DAY_SHORT_LABELS: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Full labels (e.g. "Monday"). */
export const DAY_FULL_LABELS: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

// 24-hour "HH:MM" — 00:00 through 23:59.
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Convert an "HH:MM" string to minutes-since-midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const timeSchema = z
  .string()
  .regex(TIME_REGEX, "Time must be in 24-hour HH:MM format");

const openCloseSchema = z
  .object({
    open: timeSchema,
    close: timeSchema,
  })
  .strict()
  .refine((v) => toMinutes(v.open) < toMinutes(v.close), {
    message: "Opening time must be before closing time",
    path: ["close"],
  });

const closedSchema = z.object({ closed: z.literal(true) }).strict();

/** A single day's value: open window, explicitly closed, or unspecified. */
const dayHoursSchema = z.union([openCloseSchema, closedSchema]);
const dayValueSchema = dayHoursSchema.nullable();

/**
 * Zod schema for a full weekly schedule. All 7 keys are required (the editor
 * always emits all of them); a day the operator left blank is `null`.
 */
export const weeklyHoursSchema = z.object({
  mon: dayValueSchema,
  tue: dayValueSchema,
  wed: dayValueSchema,
  thu: dayValueSchema,
  fri: dayValueSchema,
  sat: dayValueSchema,
  sun: dayValueSchema,
});

export type DayHours = z.infer<typeof dayHoursSchema>;
export type WeeklyHours = z.infer<typeof weeklyHoursSchema>;

/** A blank schedule with every day unspecified (null). */
export function emptyWeeklyHours(): WeeklyHours {
  return {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  };
}

/**
 * Coerce arbitrary JSON into a WeeklyHours value, or null when it isn't a
 * valid schedule. Handy for reading DB/form JSON before display.
 */
export function parseWeeklyHours(value: unknown): WeeklyHours | null {
  const result = weeklyHoursSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Type guard: a day value that represents an explicit closure. */
export function isClosed(day: DayHours | null | undefined): day is { closed: true } {
  return !!day && "closed" in day && day.closed === true;
}

/** Type guard: a day value with an open/close window. */
export function isOpenWindow(
  day: DayHours | null | undefined,
): day is { open: string; close: string } {
  return !!day && "open" in day && "close" in day;
}

/** True when every day is unspecified (null/absent) — nothing to display. */
export function hasAnyHours(hours: WeeklyHours | null | undefined): boolean {
  if (!hours) return false;
  return DAY_KEYS.some((k) => hours[k] != null);
}

/**
 * Format a 24-hour "HH:MM" string as a 12-hour clock time, e.g.
 * "08:00" -> "8:00 AM", "13:30" -> "1:30 PM", "00:00" -> "12:00 AM".
 */
export function formatTime(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = Number(hStr);
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr.padStart(2, "0")} ${period}`;
}

/**
 * Human-readable label for a single day's hours.
 * - open window -> "8:00 AM – 6:00 PM"
 * - closed      -> "Closed"
 * - null/unset  -> "" (caller decides how to render unspecified)
 */
export function formatDayHours(day: DayHours | null | undefined): string {
  if (isClosed(day)) return "Closed";
  if (isOpenWindow(day)) {
    return `${formatTime(day.open)} – ${formatTime(day.close)}`;
  }
  return "";
}

/** A serialized, comparable key for a day value (for grouping). */
function dayValueKey(day: DayHours | null): string {
  if (day == null) return "null";
  if (isClosed(day)) return "closed";
  return `${(day as { open: string }).open}-${(day as { close: string }).close}`;
}

export type WeeklyHoursGroup = {
  /** Day-label range, e.g. "Mon" or "Mon – Fri". */
  label: string;
  /** Formatted hours text, e.g. "8:00 AM – 6:00 PM" or "Closed". */
  hours: string;
};

/**
 * Group consecutive days that share the same hours into a compact list.
 * Unspecified (null) days are omitted. Returns e.g.
 * `[{ label: "Mon – Fri", hours: "8:00 AM – 6:00 PM" }, { label: "Sat", hours: "Closed" }]`.
 */
export function formatWeeklyHours(
  hours: WeeklyHours | null | undefined,
): WeeklyHoursGroup[] {
  if (!hours) return [];

  const groups: WeeklyHoursGroup[] = [];
  let runStart: DayKey | null = null;
  let runEnd: DayKey | null = null;
  let runKey: string | null = null;

  const flush = () => {
    if (runStart == null || runEnd == null) return;
    const label =
      runStart === runEnd
        ? DAY_SHORT_LABELS[runStart]
        : `${DAY_SHORT_LABELS[runStart]} – ${DAY_SHORT_LABELS[runEnd]}`;
    groups.push({ label, hours: formatDayHours(hours[runStart]) });
  };

  for (const key of DAY_KEYS) {
    const value = hours[key];
    if (value == null) {
      // Unspecified day breaks any run and is not shown.
      flush();
      runStart = runEnd = runKey = null;
      continue;
    }
    const vKey = dayValueKey(value);
    if (runKey === vKey) {
      runEnd = key;
    } else {
      flush();
      runStart = runEnd = key;
      runKey = vKey;
    }
  }
  flush();

  return groups;
}

/** A schema.org OpeningHoursSpecification object for JSON-LD. */
export type OpeningHoursSpecification = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
};

/**
 * Map structured weekly hours to schema.org `OpeningHoursSpecification`
 * objects for JSON-LD structured data. Only days with an explicit open/close
 * window produce a spec; closed and unspecified days are omitted.
 */
export function toOpeningHoursSpecification(
  hours: WeeklyHours | null | undefined,
): OpeningHoursSpecification[] {
  if (!hours) return [];
  const specs: OpeningHoursSpecification[] = [];
  for (const key of DAY_KEYS) {
    const value = hours[key];
    if (isOpenWindow(value)) {
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${DAY_FULL_LABELS[key]}`,
        opens: value.open,
        closes: value.close,
      });
    }
  }
  return specs;
}
