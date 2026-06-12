"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

import {
  FieldButtonGroup,
  FieldDateInput,
  FieldSelect,
  Form,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  type BookingFormValues,
  bookingSchema,
} from "@/features/booking/schemas/bookingSchema";
import {
  getAvailableSlots,
  isSlotInPast,
  type TimeSlot,
} from "@/features/booking/utils/slots";
import type { CourtSummary } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";

function formatPrice(amount: string, currency: string): string {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSlotLabel(slot: TimeSlot): string {
  const toDisplayTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return format(date, "h:mm a");
  };

  return `${toDisplayTime(slot.start)} – ${toDisplayTime(slot.end)}`;
}

function slotKey(slot: TimeSlot): string {
  return `${slot.start}-${slot.end}`;
}

type BookingFormProps = {
  className?: string;
  courts: CourtSummary[];
  onSubmit: (data: BookingFormValues) => void;
};

const BookingForm = ({ className, courts, onSubmit }: BookingFormProps) => {
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      date: new Date(),
      court_id: courts[0] ? String(courts[0].id) : "",
      slot: null,
    },
  });

  const date = form.watch("date");
  const courtId = form.watch("court_id");
  const selectedSlot = form.watch("slot");

  const selectedCourt = useMemo(
    () => courts.find((court) => String(court.id) === courtId),
    [courts, courtId],
  );

  const availableSlots = useMemo(() => {
    if (!date || !selectedCourt) {
      return [];
    }

    return getAvailableSlots(selectedCourt.schedules, date).filter(
      (slot) => !isSlotInPast(date, slot.start),
    );
  }, [date, selectedCourt]);

  const courtItems = useMemo(
    () =>
      courts.map((court) => ({
        value: String(court.id),
        label: `${court.title} (${court.sport.name})`,
      })),
    [courts],
  );

  const canBook = date && selectedCourt && selectedSlot && courts.length > 0;
  const { isSubmitting } = form.formState;

  const clearSlot = () => {
    form.setValue("slot", null, { shouldValidate: true });
  };

  return (
    <Form form={form} onSubmit={onSubmit} className={cn("space-y-4", className)}>
      <FieldDateInput<BookingFormValues>
        name="date"
        label="Date"
        disabledDays={{ before: today }}
        onValueChange={clearSlot}
      />

      <FieldSelect<BookingFormValues>
        name="court_id"
        label="Court"
        items={courtItems}
        placeholder="Select a court"
        onValueChange={clearSlot}
      />

      <FieldButtonGroup<BookingFormValues, TimeSlot>
        name="slot"
        label="Time"
        options={availableSlots}
        getOptionKey={slotKey}
        getOptionLabel={formatSlotLabel}
        emptyMessage={
          date
            ? "No available times on this day."
            : "Select a date to see available times."
        }
      />

      {canBook && selectedCourt ? (
        <div className="rounded-lg bg-muted/60 px-3 py-3 text-sm">
          <p className="font-medium">{selectedCourt.title}</p>
          <p className="text-muted-foreground">
            {format(date, "EEEE, MMMM d")} · {formatSlotLabel(selectedSlot!)}
          </p>
          {selectedCourt.price_per_hour.amount ? (
            <p className="mt-1 font-medium">
              {formatPrice(
                selectedCourt.price_per_hour.amount,
                selectedCourt.price_per_hour.currency,
              )}
              <span className="font-normal text-muted-foreground"> / hour</span>
            </p>
          ) : null}
        </div>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting}
        isLoading={isSubmitting}
      >
        Book Court
      </Button>
    </Form>
  );
};

export default BookingForm;
