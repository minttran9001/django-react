"use client";

import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { UseFormReturn } from "react-hook-form";

import {
  FieldDateInput,
  FieldSelect,
  Form,
} from "@/components/form";
import { FieldButtonGroupComponent } from "@/components/form/FieldButtonGroup";
import { useFormField } from "@/components/form/hooks/useFormField";
import { Button } from "@/components/ui/button";
import {
  type BookingSeriesFormValues,
  bookingSeriesSchema,
  type SeriesTimeSlot,
} from "@/features/booking/schemas/bookingSeriesSchema";
import {
  expandSeriesToSlots,
  endOfMonth,
  findFirstMatchingDate,
  startOfMonth,
} from "@/features/booking/utils/expandSeriesToSlots";
import { formatTimeRange } from "@/features/court-centers/utils/scheduleCalendar";
import type { AvailableSlot, CourtSummary } from "@/features/court-centers/types";
import { useGetCourtCenterQuery, useGetSportsQuery } from "@/lib/api/courtCenterApi";
import { formatApiDate, normalizeToDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import OrderBreakdownLineItems from "./OrderBreakdownLineItems";
import { FieldMonthlyPatternBuilder } from "./MonthlyPatternBuilder";
import { useSpeculatedLineItemsQuery, serializeLineItemSlots } from "@/lib/api/lineItem";
import { ApiErrorLike, getApiErrorMessage } from "@/lib/api/errors";
import { Loader2Icon } from "lucide-react";
import useDebounce from "@/hooks/useDebounce";

function formatSeriesSlotLabel(slot: SeriesTimeSlot): string {
  return formatTimeRange(slot.start, slot.end);
}

function seriesSlotKey(slot: SeriesTimeSlot): string {
  return `${slot.start}-${slot.end}`;
}

function toSeriesTimeOptions(slots: AvailableSlot[]): SeriesTimeSlot[] {
  const seen = new Set<string>();
  const options: SeriesTimeSlot[] = [];

  for (const slot of slots) {
    const start = slot.start.slice(0, 5);
    const end = slot.end.slice(0, 5);
    const key = `${start}-${end}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({ start, end });
  }

  return options;
}

function isSeriesSlotSelected(
  value: SeriesTimeSlot[],
  option: SeriesTimeSlot,
  getOptionKey: (option: SeriesTimeSlot) => string,
): boolean {
  return value.some((item) => getOptionKey(item) === getOptionKey(option));
}

type BookingSeriesFormProps = {
  className?: string;
  courtCenterId: string;
  onSubmit: (data: BookingSeriesFormValues) => void;
} & Omit<BookingSeriesFormContentProps, "form" | "courts">;

type BookingSeriesFormContentProps = {
  form: UseFormReturn<BookingSeriesFormValues>;
  courts: CourtSummary[];
  isLoadingCourts?: boolean;
  isLoading?: boolean;
  error?: ApiErrorLike;
};

function FieldSeriesTimeSlots({
  options,
  emptyMessage,
  disabled,
}: {
  options: SeriesTimeSlot[];
  emptyMessage: string;
  disabled?: boolean;
}) {
  const { field, errorMessage, invalid, id } =
    useFormField<BookingSeriesFormValues, "timeSlots">("timeSlots");

  return (
    <FieldButtonGroupComponent
      id={id}
      label="Time"
      description="Same time applies on every matching day in your pattern."
      value={field.value ?? []}
      onChange={field.onChange}
      error={errorMessage}
      invalid={invalid}
      options={options}
      getOptionKey={seriesSlotKey}
      getOptionLabel={formatSeriesSlotLabel}
      isOptionSelected={isSeriesSlotSelected}
      emptyMessage={emptyMessage}
      disabled={disabled}
    />
  );
}

const BookingSeriesFormContent = ({
  form,
  courts,
  isLoadingCourts,
  isLoading,
  error,
}: BookingSeriesFormContentProps) => {
  const sports = useGetSportsQuery();
  const sportItems = useMemo(
    () =>
      sports.data?.map((sport) => ({
        value: String(sport.id),
        label: sport.name,
      })),
    [sports.data],
  );

  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  const { isSubmitting } = form.formState;

  const courtId = form.watch("courtId");
  const selectedSportId = form.watch("selectedSportId");
  const recurrenceRules = form.watch("recurrenceRules");
  const timeSlots = form.watch("timeSlots");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");

  const courtItems = useMemo(
    () =>
      courts
        .filter((court) => court.sport.id === Number(selectedSportId))
        .map((court) => ({
          value: String(court.id),
          label: `Court ${court.title} (${court.sport.name})`,
        })),
    [courts, selectedSportId],
  );

  const expandedSlots = useMemo(() => {
    if (
      !startDate ||
      !endDate ||
      recurrenceRules.length === 0 ||
      timeSlots.length === 0
    ) {
      return [];
    }

    return expandSeriesToSlots(
      recurrenceRules,
      timeSlots,
      startDate,
      endDate,
    );
  }, [recurrenceRules, timeSlots, startDate, endDate]);

  const lineItemQueryArgs = useMemo(
    () => ({
      courtId,
      slots: serializeLineItemSlots(expandedSlots),
    }),
    [courtId, expandedSlots],
  );

  const debouncedQueryArgs = useDebounce(lineItemQueryArgs, 500);

  const {
    data: speculatedLineItemsData,
    isLoading: isSpeculatedLineItemsLoading,
    error: speculatedLineItemsError,
    isFetching: isSpeculatedLineItemsFetching,
  } = useSpeculatedLineItemsQuery(debouncedQueryArgs, {
    skip:
      !debouncedQueryArgs.courtId ||
      debouncedQueryArgs.slots.length === 0,
  });

  const selectedCourt = useMemo(
    () => courts.find((court) => String(court.id) === courtId),
    [courts, courtId],
  );


  const availableSlots = selectedCourt?.availableSlots ?? [];


  const hasPattern =
    recurrenceRules.some(
      (rule) => rule.weeks.length > 0,
    );
  const canBook =
    selectedCourt &&
    hasPattern &&
    timeSlots.length > 0 &&
    expandedSlots.length > 0 &&
    courts.length > 0;

  const monthCount =
    startDate && endDate
      ? endDate.getMonth() -
      startDate.getMonth() +
      12 * (endDate.getFullYear() - startDate.getFullYear()) +
      1
      : 0;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldDateInput<BookingSeriesFormValues>
          name="startDate"
          label="From"
          variant="popover"
          placeholder="Start month"
          disabledDays={{ before: today }}
        />

        <FieldDateInput<BookingSeriesFormValues>
          name="endDate"
          label="To"
          variant="popover"
          placeholder="End month"
          disabledDays={{ before: startDate ?? today }}
        />
      </div>

      {isLoadingCourts ? (
        <div className="flex items-center justify-center">
          <Loader2Icon className="size-4 animate-spin" />
        </div>
      ) : (
        <>
          <FieldSelect<BookingSeriesFormValues>
            name="selectedSportId"
            label="Sport"
            items={sportItems ?? []}
            placeholder="Select a sport"
            onValueChange={() => {
              form.setValue("courtId", "");
              form.setValue("timeSlots", []);
            }}
          />

          {courtItems.length > 0 ? (
            <FieldSelect<BookingSeriesFormValues>
              name="courtId"
              label="Court"
              items={courtItems}
              disabled={!selectedSportId}
              placeholder="Select a court"
              onValueChange={() => {
                form.setValue("timeSlots", []);
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No courts available for this sport.
            </p>
          )}

          <FieldMonthlyPatternBuilder<BookingSeriesFormValues>
            name="recurrenceRules"
            startDate={startDate}
            endDate={endDate}
            availableSlots={availableSlots}
          />

        </>
      )}

      {hasPattern && expandedSlots.length > 0 ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
          <p className="font-medium">
            {expandedSlots.length}{" "}
            {expandedSlots.length === 1 ? "session" : "sessions"} across{" "}
            {monthCount} {monthCount === 1 ? "month" : "months"}
          </p>
          <p className="text-muted-foreground">
            From {format(startDate, "MMM yyyy")} to {format(endDate, "MMM yyyy")}
          </p>
        </div>
      ) : hasPattern ? (
        <p className="text-sm text-muted-foreground">
          No sessions match your pattern in the selected range. Adjust weeks,
          days, or months.
        </p>
      ) : null}

      <Button
        variant="outline"
        className="w-full"
        type="button"
        onClick={() => {
          form.setValue("timeSlots", []);
          form.setValue("recurrenceRules", [{ month: today, weeks: [] }]);
          form.setValue("startDate", startOfMonth(today));
          form.setValue("endDate", endOfMonth(today));
        }}
      >
        Clear
      </Button>

      {canBook && selectedCourt ? (
        isSpeculatedLineItemsLoading || isSpeculatedLineItemsFetching ? (
          <div className="flex items-center justify-center">
            <Loader2Icon className="size-4 animate-spin" />
          </div>
        ) : speculatedLineItemsError ? (
          <p className="text-sm text-destructive">
            {getApiErrorMessage(speculatedLineItemsError)}
          </p>
        ) : (
          <OrderBreakdownLineItems
            speculatedLineItemsData={
              speculatedLineItemsData ?? {
                lineItems: [],
                payInTotal: { amount: 0, currency: "VND" },
              }
            }
            includeFor={["customer"]}
          />
        )
      ) : null}

      {error ? (
        <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || isLoading || isLoadingCourts || !canBook}
        isLoading={isSubmitting}
      >
        Book monthly
      </Button>
    </>
  );
};

const BookingSeriesForm = ({
  className,
  onSubmit,
  courtCenterId,
  ...props
}: BookingSeriesFormProps) => {
  const today = useMemo(() => {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    return value;
  }, []);

  return (
    <Form
      schema={bookingSeriesSchema}
      defaultValues={{
        courtId: "",
        selectedSportId: "",
        recurrenceRules: [{ month: today, weeks: [] }],
        timeSlots: [],
        startDate: today,
        endDate: endOfMonth(today),
      }}
      onSubmit={onSubmit}
      className={cn("space-y-4", className)}
    >
      {(form) => (
        <BookingSeriesFormWithCourtData
          form={form}
          courtCenterId={courtCenterId}
          {...props}
        />
      )}
    </Form>
  );
};

function BookingSeriesFormWithCourtData({
  form,
  courtCenterId,
  ...props
}: Omit<BookingSeriesFormContentProps, "courts" | "isLoadingCourts"> & {
  courtCenterId: string;
}) {
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const dateFrom = useMemo(() => startDate ? formatApiDate(normalizeToDay(startDate)) : undefined, [startDate]);
  const dateTo = useMemo(() => endDate ? formatApiDate(normalizeToDay(endDate)) : undefined, [endDate]);

  const {
    data: courtCenter,
    isLoading: isCourtCenterLoading,
    isFetching: isCourtCenterFetching,
  } = useGetCourtCenterQuery(
    {
      id: courtCenterId,
      dateFrom,
      dateTo,
    },
    { skip: !courtCenterId || !dateFrom || !dateTo, refetchOnMountOrArgChange: true },
  );

  const courts = useMemo(() => courtCenter?.courts ?? [], [courtCenter?.courts]);

  return (
    <BookingSeriesFormContent
      form={form}
      courts={courts}
      isLoadingCourts={isCourtCenterLoading || isCourtCenterFetching}
      {...props}
    />
  );
}

export default BookingSeriesForm;
