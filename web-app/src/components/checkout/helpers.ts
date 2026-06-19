import { format } from "date-fns";
import { useSyncExternalStore } from "react";

import {
  minutesToTime,
  timeToMinutes,
} from "@/features/court-centers/utils/scheduleCalendar";
import type { LineItemSlotInput } from "@/lib/api/lineItem";

export const PAYMENT_WINDOW_MINUTES = 15;

export function combineAdjacentSlots(
  slots: LineItemSlotInput[],
): LineItemSlotInput[] {
  if (slots.length <= 1) {
    return slots;
  }

  const sorted = [...slots].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });

  const combined: LineItemSlotInput[] = [];

  for (const slot of sorted) {
    const last = combined[combined.length - 1];
    const slotStart = timeToMinutes(slot.start);
    const slotEnd = timeToMinutes(slot.end);

    if (
      last &&
      last.date === slot.date &&
      timeToMinutes(last.end) >= slotStart
    ) {
      combined[combined.length - 1] = {
        ...last,
        end: minutesToTime(Math.max(timeToMinutes(last.end), slotEnd)),
      };
      continue;
    }

    combined.push({ ...slot });
  }

  return combined;
}

export function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function formatSlotTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, "h:mm a");
}
