import z from "zod";
import { locationSchema } from "./locationSchema";

export const courtCenterSearchSchema = z.object({
  q: z.string().optional(),
  address: locationSchema,
  sport_ids: z.array(z.string()).optional(),
  date: z.date().optional(),
  duration: z.number().optional(),
  radius_km: z.number("Invalid radius").optional(),
});

export type CourtCenterSearchFormValues = z.infer<
  typeof courtCenterSearchSchema
>;
