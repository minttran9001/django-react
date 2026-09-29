"use client";

import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";

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
import { type TimeSlot } from "@/features/booking/utils/slots";
import type {
  AvailableSlot,
  CourtSummary,
  SlotsByCourt,
} from "@/features/court-centers/types";
import { courtSportId, courtSportName } from "@/features/court-centers/types";
import { useGetSportsQuery } from "@/lib/api/courtCenterApi";
import {
  usePublicCourtCenterQuery,
  usePublicCourtTimeslotsQuery,
} from "@/lib/api/courtCenterPublicQueries";
import { formatApiDate, getDayKey, normalizeToDay, type DayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";
import OrderBreakdownLineItems from "./OrderBreakdownLineItems";
import { useSpeculatedLineItemsQuery, serializeLineItemSlots } from "@/lib/api/lineItem";
import { ApiErrorLike, getApiErrorMessage } from "@/lib/api/errors";
import { Loader2Icon } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";

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

function toTimeSlot(slot: AvailableSlot): TimeSlot {
  return {
    date: normalizeToDay(slot.date),
    start: slot.start.slice(0, 5),
    end: slot.end.slice(0, 5),
  };
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
  courtCenterId: string;
  onSubmit: (data: BookingFormValues) => void;
} & Omit<BookingFormContentProps, "form" | "courts" | "slotsByCourt">;

type BookingFormContentProps = {
  form: UseFormReturn<BookingFormValues>;
  courts: CourtSummary[];
  slotsByCourt: SlotsByCourt;
  isLoadingCourts?: boolean;
  isLoading?: boolean;
  error?: ApiErrorLike;
};

const BookingFormContent = ({
  form,
  courts,
  slotsByCourt,
  isLoadingCourts,
  isLoading,
  error,
}: BookingFormContentProps) => {

  const sports = useGetSportsQuery();
  const sportItems = useMemo(() => sports.data?.map((sport) => ({
    value: String(sport.id),
    label: sport.name,
  })), [sports.data]);

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);


  const { isSubmitting } = form.formState;

  const date = form.watch("selectedDate");
  const courtId = form.watch("courtId");
  const selectedSlots = form.watch("slots");
  const selectedSportId = form.watch("selectedSportId");

  const courtItems = useMemo(
    () => courts.filter((court) => courtSportId(court) === Number(selectedSportId)).map((court) => ({
      value: String(court.id),
      label: `Court ${court.title} (${courtSportName(court)})`,
    })),
    [courts, selectedSportId],
  );

  const lineItemQueryArgs = useMemo(
    () => ({
      courtId,
      slots: serializeLineItemSlots(selectedSlots),
    }),
    [courtId, selectedSlots],
  );

  const debouncedQueryArgs = useDebounce(lineItemQueryArgs, 500);

  const {
    data: speculatedLineItemsData,
    isLoading: isSpeculatedLineItemsLoading,
    error: speculatedLineItemsError,
    isFetching: isSpeculatedLineItemsFetching,
  } = useSpeculatedLineItemsQuery(debouncedQueryArgs, {
    skip: !date || !debouncedQueryArgs.courtId || debouncedQueryArgs.slots.length === 0,
  });

  const selectedCourt = useMemo(
    () => courts.find((court) => String(court.id) === courtId),
    [courts, courtId],
  );

  const courtSlots = useMemo(
    () => (selectedCourt ? slotsByCourt[selectedCourt.id] ?? [] : []),
    [selectedCourt, slotsByCourt],
  );

  const availableSlots = useMemo(
    () => courtSlots.map(toTimeSlot),
    [courtSlots],
  );

  useEffect(() => {
    if (!selectedCourt || selectedSlots.length === 0) {
      return;
    }

    const allowedKeys = new Set(
      courtSlots.map((slot) =>
        `${slot.date}-${slot.start.slice(0, 5)}-${slot.end.slice(0, 5)}`,
      ),
    );
    const nextSlots = selectedSlots.filter((slot) =>
      allowedKeys.has(
        `${formatApiDate(normalizeToDay(slot.date))}-${slot.start}-${slot.end}`,
      ),
    );

    if (nextSlots.length !== selectedSlots.length) {
      form.setValue("slots", nextSlots);
    }
  }, [courtSlots, form, selectedCourt, selectedSlots]);

  const canBook = date && selectedCourt && selectedSlots.length > 0 && courts.length > 0;
  const dayLabels = useMemo(
    () => getDayLabels(selectedSlots),
    [selectedSlots],
  );



  return (<>
    <FieldDateInput<BookingFormValues>
      name="selectedDate"
      label="Date"
      disabledDays={{ before: today }}
      dayLabels={dayLabels}
    />

    {isLoadingCourts ? <div className="flex items-center justify-center"><Loader2Icon className="w-4 h-4 animate-spin" /></div> :
      <>
        <FieldSelect<BookingFormValues>
          name="selectedSportId"
          label="Sport"
          items={sportItems ?? []}
          placeholder="Select a sport"
          onValueChange={() => {
            form.setValue("courtId", "");
            form.setValue("slots", []);
          }}
        />

        {courtItems.length > 0 ? <FieldSelect<BookingFormValues>
          name="courtId"
          label="Court"
          items={courtItems}
          disabled={!selectedSportId}
          placeholder="Select a court"
          onValueChange={() => {
            form.setValue("slots", []);
          }}
        />
          : <p className="text-sm text-muted-foreground">No courts available for this sport.</p>}

        {courtItems.length > 0 && <FieldButtonGroup<BookingFormValues, TimeSlot>
          name="slots"
          label="Time"
          options={availableSlots}
          getOptionKey={slotKey}
          getOptionLabel={formatSlotLabel}
          emptyMessage={
            !date
              ? "Select a date to see available times."
              : isLoadingCourts
                ? "Loading available times..."
                : "No available times on this day."
          }
        />
        }</>}

    <Button variant="outline" className="w-full" onClick={() => {
      form.setValue("slots", []);
      form.setValue("selectedDate", new Date());
    }}>
      Clear
    </Button>

    {canBook && selectedCourt ? (
      (isSpeculatedLineItemsLoading || isSpeculatedLineItemsFetching) ? <div className="flex items-center justify-center"><Loader2Icon className="w-4 h-4 animate-spin" /></div> : speculatedLineItemsError ? <div className="flex items-center justify-center"><p className="text-sm text-destructive">{getApiErrorMessage(speculatedLineItemsError)}</p></div> : <OrderBreakdownLineItems speculatedLineItemsData={speculatedLineItemsData ?? { lineItems: [], payInTotal: { amount: 0, currency: "VND" } }} includeFor={["customer"]} />
    ) : null}


    {error ? <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p> : null}
    <Button
      type="submit"
      className="w-full"
      disabled={isSubmitting || isLoading || isLoadingCourts}
      isLoading={isSubmitting}
    >
      Book Court
    </Button></>)
};

const BookingForm = ({
  className,
  onSubmit,
  courtCenterId,
  ...props
}: BookingFormProps) => {
  const today = useMemo(() => new Date(), []);

  return (
    <Form
      schema={bookingSchema}
      defaultValues={{
        selectedDate: today,
        courtId: "",
        slots: [],
      }}
      onSubmit={onSubmit}
      className={cn("space-y-4", className)}
    >
      {(form) => (
        <BookingFormWithCourtData
          form={form}
          courtCenterId={courtCenterId}
          {...props}
        />
      )}
    </Form>
  );
};

function BookingFormWithCourtData({
  form,
  courtCenterId,
  ...props
}: Omit<
  BookingFormContentProps,
  "courts" | "slotsByCourt" | "isLoadingCourts"
> & {
  courtCenterId: string;
}) {
  const date = form.watch("selectedDate");

  const {
    data: courtCenter,
    isLoading: isCourtCenterLoading,
    isFetching: isCourtCenterFetching,
  } = usePublicCourtCenterQuery(
    { id: courtCenterId },
    { skip: !courtCenterId },
  );

  const {
    data: slotsByCourt,
    isLoading: isSlotsLoading,
    isFetching: isSlotsFetching,
  } = usePublicCourtTimeslotsQuery(
    {
      id: courtCenterId,
      date: date ? formatApiDate(normalizeToDay(date)) : undefined,
    },
    { skip: !courtCenterId || !date },
  );

  const courts = useMemo(
    () => courtCenter?.courts ?? [],
    [courtCenter?.courts],
  );
  return (
    <BookingFormContent
      form={form}
      courts={courts}
      slotsByCourt={slotsByCourt}
      isLoadingCourts={
        isCourtCenterLoading ||
        isCourtCenterFetching ||
        isSlotsLoading ||
        isSlotsFetching
      }
      {...props}
    />
  );
}

export default BookingForm;
