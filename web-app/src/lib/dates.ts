import { format } from "date-fns";

export type FlexibleDateInput = Date | string | number;

export type DayLabel = {
  date: FlexibleDateInput;
  label: string;
};

/** Format a local calendar date for API fields (YYYY-MM-DD). */
export function formatApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Parse common date inputs without shifting the calendar day.
 * Supports Date, timestamp, YYYY-MM-DD, and ISO datetime strings.
 */
export function parseFlexibleDate(
  value: FlexibleDateInput | null | undefined,
): Date | undefined {
  if (value == null || value === "") {
    return undefined;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value);
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  const trimmed = value.trim();
  const datePart = trimmed.split("T")[0];
  const ymdMatch = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (ymdMatch) {
    const [, year, month, day] = ymdMatch.map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** @deprecated Use parseFlexibleDate instead. */
export function parseApiDate(value: string | null | undefined): Date | undefined {
  return parseFlexibleDate(value);
}

/** Normalize any supported date input to local start-of-day. */
export function normalizeToDay(value: FlexibleDateInput): Date {
  const date = parseFlexibleDate(value);
  if (!date) {
    throw new Error(`Invalid date: ${String(value)}`);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

/** Canonical local day key used internally for grouping and lookup. */
export function getDayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function isSameDay(a: Date, b: Date): boolean {
  return getDayKey(a) === getDayKey(b);
}

export function buildDayLabelMap(entries: DayLabel[] = []): Record<string, string> {
  const map: Record<string, string> = {};

  for (const entry of entries) {
    const day = parseFlexibleDate(entry.date);
    if (!day) {
      continue;
    }

    map[getDayKey(normalizeToDay(day))] = entry.label;
  }

  return map;
}

export function dayLabelsToDates(entries: DayLabel[] = []): Date[] {
  return entries.flatMap((entry) => {
    const day = parseFlexibleDate(entry.date);
    return day ? [normalizeToDay(day)] : [];
  });
}
