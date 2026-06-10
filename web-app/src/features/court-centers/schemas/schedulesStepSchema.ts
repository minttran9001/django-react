import { z } from "zod";

const scheduleSlotSchema = z
  .object({
    id: z.number().int().positive().optional(),
    day_of_week: z.number().int().min(0).max(6),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
  })
  .refine((slot) => slot.end_time > slot.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  });

const courtSchedulesSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  schedules: z
    .array(scheduleSlotSchema)
    .min(1, "Add at least one availability slot"),
});

export const schedulesStepSchema = z.object({
  courts: z.array(courtSchedulesSchema).min(1, "Add schedules for each court"),
});

export type SchedulesStepValues = z.infer<typeof schedulesStepSchema>;
