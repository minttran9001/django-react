import { addDays, startOfWeek } from "date-fns";

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
];

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

function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Sunday-start calendar week index within the month (1-based), matching
 * MonthlyPatternBuilder.getWeekOptions.
 */
export function calendarWeekIndexInMonth(date: Date): number {
  const day = normalizeToDay(date);
  const monthStart = startOfMonth(day);
  const monthEnd = endOfMonth(day);
  let weekStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  let weekIndex = 1;

  while (weekStart <= monthEnd) {
    const weekEnd = addDays(weekStart, 6);
    if (day >= weekStart && day <= weekEnd) {
      return weekIndex;
    }
    weekStart = addDays(weekStart, 7);
    weekIndex += 1;
  }

  return weekIndex;
}

function dateMatchesRules(date: Date, rules: RecurrenceRule[]): boolean {
  const rule = rules.find((candidate) => sameMonth(candidate.month, date));
  if (!rule) {
    return false;
  }

  const weekIndex = calendarWeekIndexInMonth(date);
  // MonthlyPatternBuilder stores JS getDay() values (Sunday = 0).
  const dow = date.getDay();

  return rule.weeks.some(
    (weekRule) => weekRule.week === weekIndex && weekRule.days.includes(dow),
  );
}

export function expandSeriesToSlots(
  rules: RecurrenceRule[],
  timeSlots: SeriesTimeSlot[],
  startDate: Date,
  endDate: Date,
): ExpandedSlot[] {
  const boundStart = normalizeToDay(startDate);
  const boundEnd = normalizeToDay(endDate);
  const iterStart = startOfMonth(startDate);
  const iterEnd = endOfMonth(endDate);
  const slots: ExpandedSlot[] = [];
  const current = new Date(iterStart);

  while (current <= iterEnd) {
    const day = normalizeToDay(current);
    if (
      day >= boundStart &&
      day <= boundEnd &&
      dateMatchesRules(day, rules)
    ) {
      for (const timeSlot of timeSlots) {
        slots.push({
          date: day,
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
  const boundStart = normalizeToDay(startDate);
  const boundEnd = normalizeToDay(endDate);
  const iterStart = startOfMonth(startDate);
  const iterEnd = endOfMonth(endDate);
  const current = new Date(iterStart);

  while (current <= iterEnd) {
    const day = normalizeToDay(current);
    if (
      day >= boundStart &&
      day <= boundEnd &&
      dateMatchesRules(day, rules)
    ) {
      return day;
    }

    current.setDate(current.getDate() + 1);
  }

  return undefined;
}
