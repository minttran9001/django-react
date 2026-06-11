import { z } from "zod";
import MoneySchema from "./moneySchema";

const courtInputSchema = z.object({
  id: z.number().int().positive().optional(),
  sport_id: z.number().int().positive("Select a sport"),
  title: z.string().min(1, "Court title is required"),
  description: z.string().optional(),
  price_per_hour: MoneySchema,
});

export const courtsStepSchema = z.object({
  courts: z.array(courtInputSchema).min(1, "Add at least one court"),
});

export type CourtsStepValues = z.infer<typeof courtsStepSchema>;
