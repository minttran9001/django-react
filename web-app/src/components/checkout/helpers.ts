import { format } from "date-fns";
import { useSyncExternalStore } from "react";

export const PAYMENT_WINDOW_MINUTES = 15;

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
