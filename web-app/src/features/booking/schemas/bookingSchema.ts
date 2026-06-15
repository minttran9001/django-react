import { z } from "zod";

export const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
  date: z.date({ error: "Select a date" }),
});

export type TimeSlot = z.infer<typeof timeSlotSchema>;

export const bookingSchema = z.object({
  court_id: z.string().min(1, "Select a court"),
  slots: z.array(timeSlotSchema).min(1, "Select at least one time slot"),
  selected_date: z.date({ error: "Select a date" }),
});

export type BookingFormValues = z.infer<typeof bookingSchema>;
