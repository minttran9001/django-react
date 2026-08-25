import {
  DAY_OPTIONS,
  normalizeTime,
} from "@/features/court-centers/utils/wizard";

export const CALENDAR_START_HOUR = 5;
export const CALENDAR_END_HOUR = 23;
export const HOUR_HEIGHT_PX = 56;
export const DEFAULT_SLOT_DURATION_MINUTES = 60;
export const MIN_SLOT_DURATION_MINUTES = 30;
export const GRID_START_MINUTES = CALENDAR_START_HOUR * 60;
export const GRID_END_MINUTES = CALENDAR_END_HOUR * 60;

export type ScheduleSlotValue = {
  id?: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export function timeToMinutes(time: string): number {
  const [hours, minutes] = normalizeTime(time).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function snapMinutes(minutes: number, interval = 30): number {
  return Math.floor(minutes / interval) * interval;
}

export function offsetYToMinutes(offsetY: number): number {
  const clickedMinutes = GRID_START_MINUTES + (offsetY / HOUR_HEIGHT_PX) * 60;
  return snapMinutes(
    Math.max(GRID_START_MINUTES, Math.min(clickedMinutes, GRID_END_MINUTES)),
  );
}

export function clientYToMinutes(clientY: number, columnTop: number): number {
  return offsetYToMinutes(clientY - columnTop);
}

export function slotWouldOverlap(
  schedules: ScheduleSlotValue[],
  candidate: ScheduleSlotValue,
  excludeIndex?: number,
): boolean {
  const candidateStart = timeToMinutes(candidate.startTime);
  const candidateEnd = timeToMinutes(candidate.endTime);

  return schedules.some((schedule, index) => {
    if (excludeIndex !== undefined && index === excludeIndex) {
      return false;
    }
    if (schedule.dayOfWeek !== candidate.dayOfWeek) {
      return false;
    }
    const start = timeToMinutes(schedule.startTime);
    const end = timeToMinutes(schedule.endTime);
    return candidateStart < end && candidateEnd > start;
  });
}

export function getSlotResizeLimits(
  schedules: ScheduleSlotValue[],
  slotIndex: number,
): { minStartMinutes: number; maxEndMinutes: number } {
  const slot = schedules[slotIndex];
  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);

  let minStartMinutes = GRID_START_MINUTES;
  let maxEndMinutes = GRID_END_MINUTES;

  schedules.forEach((other, index) => {
    if (index === slotIndex || other.dayOfWeek !== slot.dayOfWeek) {
      return;
    }
    const otherStart = timeToMinutes(other.startTime);
    const otherEnd = timeToMinutes(other.endTime);
    if (otherEnd <= slotStart) {
      minStartMinutes = Math.max(minStartMinutes, otherEnd);
    }
    if (otherStart >= slotEnd) {
      maxEndMinutes = Math.min(maxEndMinutes, otherStart);
    }
  });

  return { minStartMinutes, maxEndMinutes };
}

export function buildSlotFromMinuteRange(
  dayOfWeek: number,
  startMinutes: number,
  endMinutes: number,
): ScheduleSlotValue {
  const snappedStart = snapMinutes(startMinutes);
  const snappedEnd = snapMinutes(endMinutes);
  const normalizedStart = Math.min(snappedStart, snappedEnd);
  const normalizedEnd = Math.max(
    Math.max(snappedStart, snappedEnd),
    normalizedStart + MIN_SLOT_DURATION_MINUTES,
  );

  return {
    dayOfWeek: dayOfWeek,
    startTime: minutesToTime(Math.max(GRID_START_MINUTES, normalizedStart)),
    endTime: minutesToTime(Math.min(GRID_END_MINUTES, normalizedEnd)),
  };
}

export function getDayLabel(dayOfWeek: number, short = false): string {
  const day = DAY_OPTIONS.find((option) => option.value === dayOfWeek);
  if (!day) {
    return "Unknown";
  }
  return short ? day.label.slice(0, 3) : day.label;
}

export function getBlockStyle(startTime: string, endTime: string) {
  const gridStartMinutes = CALENDAR_START_HOUR * 60;
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const top = ((startMinutes - gridStartMinutes) / 60) * HOUR_HEIGHT_PX;
  const height = Math.max(
    ((endMinutes - startMinutes) / 60) * HOUR_HEIGHT_PX,
    24,
  );

  return { top, height };
}

export function getCalendarHeight(): number {
  return (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * HOUR_HEIGHT_PX;
}

export function getHourLabels(): number[] {
  return Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, index) => CALENDAR_START_HOUR + index,
  );
}

export function formatHourLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${period}`;
}

export function formatTimeRange(startTime: string, endTime: string): string {
  return `${normalizeTime(startTime)} – ${normalizeTime(endTime)}`;
}

export function createSlotFromClick(
  dayOfWeek: number,
  offsetY: number,
): ScheduleSlotValue {
  const startMinutes = offsetYToMinutes(offsetY);
  const endMinutes = Math.min(
    startMinutes + DEFAULT_SLOT_DURATION_MINUTES,
    GRID_END_MINUTES,
  );

  return buildSlotFromMinuteRange(dayOfWeek, startMinutes, endMinutes);
}

export function combineAdjacentSchedules(
  schedules: ScheduleSlotValue[],
): ScheduleSlotValue[] {
  if (schedules.length <= 1) {
    return schedules;
  }

  //sort schedules by day of week and start time
  const sorted = [...schedules].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const combined: ScheduleSlotValue[] = [];

  for (const schedule of sorted) {
    const last = combined[combined.length - 1];
    const scheduleStart = timeToMinutes(schedule.startTime);
    const scheduleEnd = timeToMinutes(schedule.endTime);

    if (
      last &&
      last.dayOfWeek === schedule.dayOfWeek &&
      timeToMinutes(last.endTime) >= scheduleStart
    ) {
      combined[combined.length - 1] = {
        ...last,
        endTime: minutesToTime(
          Math.max(timeToMinutes(last.endTime), scheduleEnd),
        ),
      };
      continue;
    }

    combined.push({ ...schedule });
  }

  return combined;
}

export function groupSchedulesByDay(
  schedules: ScheduleSlotValue[],
): Record<number, Array<ScheduleSlotValue & { index: number }>> {
  const grouped: Record<
    number,
    Array<ScheduleSlotValue & { index: number }>
  > = {
    7: [],
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  };

  schedules.forEach((schedule, index) => {
    grouped[schedule.dayOfWeek]?.push({ ...schedule, index });
  });

  for (const day of Object.keys(grouped)) {
    grouped[Number(day)].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
    );
  }

  return grouped;
}
