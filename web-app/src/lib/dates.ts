import { format } from "date-fns";

/** Format a local date for API fields that expect YYYY-MM-DD. */
export function formatApiDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Parse an API date string without timezone shifting the calendar day. */
export function parseApiDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;

  const [year, month, day] = value.split("T")[0].split("-").map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
}
