"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DAY_KEYS,
  DAY_FULL_LABELS,
  emptyWeeklyHours,
  isClosed,
  isOpenWindow,
  type DayKey,
  type WeeklyHours,
} from "@/lib/hours";

interface WeeklyHoursEditorProps {
  /** Current schedule. `null`/`undefined` renders an all-unspecified grid. */
  value: WeeklyHours | null | undefined;
  onChange: (value: WeeklyHours) => void;
}

/**
 * Reusable 7-row weekly-hours editor. Each row has an open time, a close time,
 * and a "Closed" toggle. Leaving both times blank (and not closed) marks the
 * day as unspecified (null). Times are native 24h "HH:MM" values; formatting
 * to 12h happens at display time.
 *
 * Display-only feature: no "open now", no timezone. Shared by the park submit
 * form, admin edit, and operator settings.
 */
export function WeeklyHoursEditor({ value, onChange }: WeeklyHoursEditorProps) {
  const hours: WeeklyHours = value ?? emptyWeeklyHours();

  const update = (day: DayKey, next: WeeklyHours[DayKey]) => {
    onChange({ ...hours, [day]: next });
  };

  const setClosed = (day: DayKey, checked: boolean) => {
    update(day, checked ? { closed: true } : null);
  };

  const setTime = (day: DayKey, which: "open" | "close", time: string) => {
    const current = hours[day];
    const open = which === "open" ? time : isOpenWindow(current) ? current.open : "";
    const close = which === "close" ? time : isOpenWindow(current) ? current.close : "";
    if (!open && !close) {
      update(day, null);
    } else {
      update(day, { open, close });
    }
  };

  return (
    <div className="space-y-2" data-testid="weekly-hours-editor">
      {DAY_KEYS.map((day) => {
        const current = hours[day];
        const closed = isClosed(current);
        const open = isOpenWindow(current) ? current.open : "";
        const close = isOpenWindow(current) ? current.close : "";

        return (
          <div
            key={day}
            className="grid grid-cols-[5.5rem_1fr_1fr_auto] items-center gap-2"
            data-testid={`weekly-hours-row-${day}`}
          >
            <span className="text-sm font-medium">{DAY_FULL_LABELS[day]}</span>

            <Input
              type="time"
              aria-label={`${DAY_FULL_LABELS[day]} opening time`}
              value={open}
              disabled={closed}
              onChange={(e) => setTime(day, "open", e.target.value)}
            />

            <Input
              type="time"
              aria-label={`${DAY_FULL_LABELS[day]} closing time`}
              value={close}
              disabled={closed}
              onChange={(e) => setTime(day, "close", e.target.value)}
            />

            <label className="flex items-center gap-1.5 text-sm">
              <Checkbox
                aria-label={`${DAY_FULL_LABELS[day]} closed`}
                checked={closed}
                onCheckedChange={(c) => setClosed(day, !!c)}
              />
              Closed
            </label>
          </div>
        );
      })}
    </div>
  );
}
