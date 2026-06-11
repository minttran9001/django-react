import z from "zod";

export const locationSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius_km: z.number().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
