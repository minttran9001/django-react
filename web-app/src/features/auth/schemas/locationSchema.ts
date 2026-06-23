import z from "zod";

export const locationSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  address: z.string().optional(),
  query: z.string().optional(),
});

export type LocationFormValues = z.infer<typeof locationSchema>;
