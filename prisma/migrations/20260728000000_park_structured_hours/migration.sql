-- Structured weekly opening hours (display-only). JSON blob shaped as
-- { mon..sun: { open: "HH:MM", close: "HH:MM" } | { closed: true } | null }.
-- Validated server-side via weeklyHoursSchema (src/lib/hours.ts). The existing
-- free-text `datesOpen` column stays as "season notes" alongside this.
-- Nullable, so existing rows simply have no structured hours.
ALTER TABLE "Park" ADD COLUMN "hours" JSONB;
