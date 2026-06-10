import { z } from "zod";

export const locationStepSchema = z
  .object({
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.latitude && data.longitude && data.address),
    {
      message: "Location is required",
      path: ["address"],
    },
  );

export type LocationStepValues = z.infer<typeof locationStepSchema>;
