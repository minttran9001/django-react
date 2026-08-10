import z from "zod";
import { locationSchema } from "./locationSchema";

export const courtCenterSearchSchema = z.object({
  q: z.string().optional(),
  address: locationSchema,
  sportIds: z.array(z.string()).optional(),
  date: z.date().optional(),
  duration: z.number().optional(),
  radiusKm: z.number("Invalid radius").optional(),
});

export type CourtCenterSearchFormValues = z.infer<
  typeof courtCenterSearchSchema
>;
