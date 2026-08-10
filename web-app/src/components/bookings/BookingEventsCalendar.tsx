"use client";

import { format, getDay, parse, startOfWeek } from "date-fns";
import { enUS } from "date-fns/locale";
import { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type EventProps,
  SlotInfo,
  Views,
} from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

import {
  getBookingEventTone,
  transactionsToCalendarEvents,
  type BookingCalendarEvent,
} from "@/features/bookings/utils/calendarEvents";
import type { Transaction } from "@/lib/types/transaction";
import { cn } from "@/lib/utils";

import "./booking-calendar.css";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const calendarViews = {
  month: true,
};

function BookingCalendarEvent({ event }: EventProps<BookingCalendarEvent>) {
  return (
    <span className="block truncate">
      <span className="font-medium">{event.title}</span>
    </span>
  );
}

type BookingEventsCalendarProps = {
  transactions: Transaction[];
  className?: string;
  initialDate?: Date;
  onSelectSlot?: (slotInfo: SlotInfo) => void;
};

const BookingEventsCalendar = ({
  transactions,
  className,
  initialDate,
  onSelectSlot,
}: BookingEventsCalendarProps) => {
  const [calendarDate, setCalendarDate] = useState(() => initialDate ?? new Date());

  const handleNavigate = useCallback((newDate: Date) => {
    setCalendarDate(newDate);
  }, []);

  const events = useMemo(
    () => transactionsToCalendarEvents(transactions),
    [transactions],
  );

  return (
    <div className={cn("booking-events-calendar min-h-[640px]", className)}>
      <Calendar
        localizer={localizer}
        events={events}
        views={calendarViews}
        view={Views.MONTH}
        date={calendarDate}
        onNavigate={handleNavigate}
        popup
        selectable
        style={{ height: 640 }}
        components={{ event: BookingCalendarEvent }}
        eventPropGetter={(event) => ({
          className: `booking-event booking-event--${getBookingEventTone(event.transaction.currentState)}`,
        })}
        onSelectSlot={onSelectSlot}
      />
    </div>
  );
};

export default BookingEventsCalendar;
