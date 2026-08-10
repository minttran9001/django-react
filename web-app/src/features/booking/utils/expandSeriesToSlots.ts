import { normalizeToDay } from "@/lib/dates";

import type {
  RecurrenceRule,
  SeriesTimeSlot,
} from "@/features/booking/schemas/bookingSeriesSchema";

export type ExpandedSlot = {
  date: Date;
  start: string;
  end: string;
};

export const WEEK_OF_MONTH_OPTIONS = [
  { value: 1, label: "Week 1", hint: "Days 1–7" },
  { value: 2, label: "Week 2", hint: "Days 8–14" },
  { value: 3, label: "Week 3", hint: "Days 15–21" },
  { value: 4, label: "Week 4", hint: "Days 22–28" },
  { value: 5, label: "Week 5", hint: "Days 29–31" },
] as const;

function dateToDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function weekOfMonth(date: Date): number {
  return Math.floor((date.getDate() - 1) / 7) + 1;
}

export function startOfMonth(date: Date): Date {
  const value = new Date(date);
  value.setDate(1);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfMonth(date: Date): Date {
  const value = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  value.setHours(0, 0, 0, 0);
  return value;
}

function dateMatchesRules(date: Date, rules: RecurrenceRule[]): boolean {
  const wom = weekOfMonth(date);
  const dow = dateToDayOfWeek(date);

  for (const rule of rules) {
    if (rule.weeks.includes(wom) && rule.days.includes(dow)) {
      return true;
    }
  }

  return false;
}

export function expandSeriesToSlots(
  rules: RecurrenceRule[],
  timeSlots: SeriesTimeSlot[],
  startDate: Date,
  endDate: Date,
): ExpandedSlot[] {
  const rangeStart = startOfMonth(startDate);
  const rangeEnd = endOfMonth(endDate);
  const slots: ExpandedSlot[] = [];
  const current = new Date(rangeStart);

  while (current <= rangeEnd) {
    if (dateMatchesRules(current, rules)) {
      for (const timeSlot of timeSlots) {
        slots.push({
          date: normalizeToDay(current),
          start: timeSlot.start,
          end: timeSlot.end,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return slots;
}

export function findFirstMatchingDate(
  rules: RecurrenceRule[],
  startDate: Date,
  endDate: Date,
): Date | undefined {
  const rangeStart = startOfMonth(startDate);
  const rangeEnd = endOfMonth(endDate);
  const current = new Date(rangeStart);

  while (current <= rangeEnd) {
    if (dateMatchesRules(current, rules)) {
      return normalizeToDay(current);
    }

    current.setDate(current.getDate() + 1);
  }

  return undefined;
}
