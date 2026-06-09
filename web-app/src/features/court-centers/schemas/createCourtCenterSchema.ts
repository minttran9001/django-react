import { z } from "zod";

const courtInputSchema = z.object({
  sport_id: z.number().int().positive("Select a sport"),
  title: z.string().min(1, "Court title is required"),
  description: z.string().optional(),
});

export const createCourtCenterSchema = z
  .object({
    title: z.string().min(1, "Center title is required"),
    description: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
    courts: z.array(courtInputSchema).min(1, "Add at least one court"),
  })
  .refine(
    (data) => {
      return data.latitude && data.longitude && data.address;
    },
    {
      path: ["latitude", "longitude", "address"],
      message: "Location is required",
    },
  );

export type CreateCourtCenterFormValues = z.infer<
  typeof createCourtCenterSchema
>;
