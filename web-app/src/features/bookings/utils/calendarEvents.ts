import { parseFlexibleDate } from "@/lib/dates";
import {
  ETransactionState,
  type Transaction,
  type TransactionBooking,
} from "@/lib/types/transaction";
import { format } from "date-fns";

export type BookingCalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  transaction: Transaction;
  booking: TransactionBooking;
};

function bookingToDateTime(date: string, time: string): Date {
  const day = parseFlexibleDate(date);
  if (!day) {
    throw new Error(`Invalid booking date: ${date}`);
  }

  const [hours, minutes] = time.split(":").map(Number);
  day.setHours(hours, minutes, 0, 0);
  return day;
}

export function transactionsToCalendarEvents(
  transactions: Transaction[],
): BookingCalendarEvent[] {
  return transactions.flatMap((transaction) =>
    transaction.bookings.map((booking) => ({
      id: `${transaction.id}-${booking.id}`,
      title: `Court ${transaction.court.title} · ${format(bookingToDateTime(booking.date, booking.startTime), "HH:mm")} - ${format(bookingToDateTime(booking.date, booking.endTime), "HH:mm")}`,
      start: bookingToDateTime(booking.date, booking.startTime),
      end: bookingToDateTime(booking.date, booking.endTime),
      transaction,
      booking,
    })),
  );
}

export type BookingEventTone = "confirmed" | "completed" | "pending" | "past";

export function getBookingEventTone(
  state: ETransactionState,
): BookingEventTone {
  switch (state) {
    case ETransactionState.PENDING_PAYMENT:
      return "pending";
    case ETransactionState.CONFIRMED:
      return "confirmed";
    case ETransactionState.COMPLETED:
    case ETransactionState.REVIEWED:
      return "completed";
    default:
      return "past";
  }
}

export function getTransactionHref(transaction: Transaction): string | null {
  if (
    [
      ETransactionState.PENDING_PAYMENT,
      ETransactionState.CONFIRMED,
      ETransactionState.COMPLETED,
      ETransactionState.REVIEWED,
    ].includes(transaction.currentState)
  ) {
    return `/transaction/${transaction.id}`;
  }

  return null;
}
