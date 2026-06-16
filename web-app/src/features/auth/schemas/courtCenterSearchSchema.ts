import z from "zod";
import { locationSchema } from "./locationSchema";

export const courtCenterSearchSchema = z.object({
  q: z.string().optional(),
  address: locationSchema,
  sport_ids: z.array(z.string()).optional(),
  date: z.date().optional(),
  duration: z.number().optional(),
});

export type CourtCenterSearchFormValues = z.infer<
  typeof courtCenterSearchSchema
>;
