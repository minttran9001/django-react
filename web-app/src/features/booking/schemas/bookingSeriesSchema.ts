import { z } from "zod";

export const recurrenceRuleSchema = z.object({
  month: z.date(),
  weeks: z.array(
    z.object({
      week: z.number().min(1).max(5),
      days: z.array(z.number().min(0).max(6)),
    }),
  ),
});

export type RecurrenceRule = z.infer<typeof recurrenceRuleSchema>;

export const seriesTimeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export type SeriesTimeSlot = z.infer<typeof seriesTimeSlotSchema>;

export const bookingSeriesSchema = z
  .object({
    courtId: z.string().min(1, "Select a court"),
    selectedSportId: z.string().min(1, "Select a sport"),
    recurrenceRules: z
      .array(recurrenceRuleSchema)
      .min(1, "Add at least one pattern rule"),
    timeSlots: z
      .array(seriesTimeSlotSchema)
      .min(1, "Select at least one time slot"),
    startDate: z.date({ error: "Select a start month" }),
    endDate: z.date({ error: "Select an end month" }),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End month must be on or after start month",
    path: ["endDate"],
  });

export type BookingSeriesFormValues = z.infer<typeof bookingSeriesSchema>;
