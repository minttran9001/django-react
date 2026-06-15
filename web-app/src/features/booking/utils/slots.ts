import type { CourtSchedule } from "@/features/court-centers/types";
import {
  DEFAULT_SLOT_DURATION_MINUTES,
  minutesToTime,
  timeToMinutes,
} from "@/features/court-centers/utils/scheduleCalendar";
import { normalizeToDay } from "@/lib/dates";

export type TimeSlot = {
  date: Date;
  start: string;
  end: string;
};

/** Map JS Date (0=Sun) to app day_of_week (0=Mon, 6=Sun). */
export function dateToDayOfWeek(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 6 : jsDay - 1;
}

export function getAvailableSlots(
  schedules: CourtSchedule[],
  date: Date,
  slotDurationMinutes = DEFAULT_SLOT_DURATION_MINUTES,
): TimeSlot[] {
  const dayOfWeek = dateToDayOfWeek(date);
  const daySchedules = schedules.filter(
    (schedule) => schedule.day_of_week === dayOfWeek,
  );

  const slots: TimeSlot[] = [];

  for (const schedule of daySchedules) {
    const startMinutes = timeToMinutes(schedule.start_time);
    const endMinutes = timeToMinutes(schedule.end_time);

    for (
      let cursor = startMinutes;
      cursor + slotDurationMinutes <= endMinutes;
      cursor += slotDurationMinutes
    ) {
      slots.push({
        date: normalizeToDay(date),
        start: minutesToTime(cursor),
        end: minutesToTime(cursor + slotDurationMinutes),
      });
    }
  }

  return slots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

export function isSlotInPast(date: Date, slotStart: string): boolean {
  const today = startOfDay(new Date());
  const selected = startOfDay(date);

  if (selected < today) {
    return true;
  }

  if (selected > today) {
    return false;
  }

  const [hours, minutes] = slotStart.split(":").map(Number);
  const slotTime = new Date(date);
  slotTime.setHours(hours, minutes, 0, 0);

  return slotTime <= new Date();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
