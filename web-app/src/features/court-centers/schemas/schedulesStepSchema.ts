import { z } from "zod";

const scheduleSlotSchema = z
  .object({
    id: z.number().int().positive().optional(),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
  })
  .refine((slot) => slot.endTime > slot.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
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
