import { z } from "zod";

export const timeSlotSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const bookingSchema = z
  .object({
    date: z.date({ message: "Select a date" }),
    court_id: z.string().min(1, "Select a court"),
    slot: timeSlotSchema.nullable(),
  })
  .refine((data) => data.slot !== null, {
    message: "Select a time slot",
    path: ["slot"],
  });

export type BookingFormValues = z.infer<typeof bookingSchema>;
