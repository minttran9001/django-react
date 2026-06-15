"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import { DefaultValues, UseFormReturn } from "react-hook-form";

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
import { getDayKey, normalizeToDay, type DayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import OrderBreakdownLineItems from "./OrderBreakdownLineItems";
import { useSpeculatedLineItemsQuery, serializeLineItemSlots } from "@/lib/api/lineItem";
import { getApiErrorMessage } from "@/lib/api/errors";
import { Loader2Icon } from "lucide-react";

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
  return `${getDayKey(normalizeToDay(slot.date))}-${slot.start}-${slot.end}`;
}

function getDayLabels(
  slots: Array<{ date: Date | string }>,
): DayLabel[] {
  const counts = new Map<string, { date: Date; count: number }>();

  for (const slot of slots) {
    const day = normalizeToDay(slot.date);
    const dayKey = getDayKey(day);
    const existing = counts.get(dayKey);

    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(dayKey, { date: day, count: 1 });
  }

  return [...counts.values()].map(({ date, count }) => ({
    date,
    label: `${count} ${count === 1 ? "slot" : "slots"}`,
  }));
}


type BookingFormProps = {
  className?: string;
  courts: CourtSummary[];
  onSubmit: (data: BookingFormValues) => void;
};

const BookingFormContent = ({ form, courts }: { form: UseFormReturn<BookingFormValues>, courts: CourtSummary[] }) => {
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);


  const courtItems = useMemo(
    () =>
      courts.map((court) => ({
        value: String(court.id),
        label: `${court.title} (${court.sport.name})`,
      })),
    [courts],
  );
  const { isSubmitting } = form.formState;

  const date = form.watch("selected_date");
  const courtId = form.watch("court_id");
  const selectedSlots = form.watch("slots");

  const lineItemQueryArgs = useMemo(
    () => ({
      courtId,
      slots: serializeLineItemSlots(selectedSlots),
    }),
    [courtId, selectedSlots],
  );

  const {
    data: speculatedLineItemsData,
    isLoading: isSpeculatedLineItemsLoading,
    error: speculatedLineItemsError,
    isFetching: isSpeculatedLineItemsFetching,
  } = useSpeculatedLineItemsQuery(lineItemQueryArgs, {
    skip: !date || !courtId || selectedSlots.length === 0,
  });

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

  const canBook = date && selectedCourt && selectedSlots.length > 0 && courts.length > 0;
  const dayLabels = useMemo(
    () => getDayLabels(selectedSlots),
    [selectedSlots],
  );

  return (<>
    <FieldDateInput<BookingFormValues>
      name="selected_date"
      label="Date"
      disabledDays={{ before: today }}
      dayLabels={dayLabels}
    />

    <FieldSelect<BookingFormValues>
      name="court_id"
      label="Court"
      items={courtItems}
      placeholder="Select a court"
      onValueChange={() => {
        form.setValue("slots", []);
        form.setValue("selected_date", new Date());
      }}
    />

    <FieldButtonGroup<BookingFormValues, TimeSlot>
      name="slots"
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
      (isSpeculatedLineItemsLoading || isSpeculatedLineItemsFetching) ? <Loader2Icon className="w-4 h-4 animate-spin" /> : speculatedLineItemsError ? <p className="text-sm text-destructive">{getApiErrorMessage(speculatedLineItemsError)}</p> : <OrderBreakdownLineItems speculatedLineItemsData={speculatedLineItemsData ?? { line_items: [], pay_in_total: { amount: 0, currency: "VND" } }} includeFor={["customer"]} />
    ) : null}

    <Button
      type="submit"
      className="w-full"
      disabled={isSubmitting}
      isLoading={isSubmitting}
    >
      Book Court
    </Button></>)
};

const BookingForm = ({ className, courts, onSubmit }: BookingFormProps) => {
  const defaultValues: DefaultValues<BookingFormValues> = {
    selected_date: new Date(),
    court_id: courts[0] ? String(courts[0].id) : "",
    slots: [],
  };

  return (
    <Form schema={bookingSchema} defaultValues={defaultValues} onSubmit={onSubmit} className={cn("space-y-4", className)}>
      {(form) => (
        <BookingFormContent form={form} courts={courts} />
      )}
    </Form>
  );
};

export default BookingForm;
