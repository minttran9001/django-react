import { z } from "zod";

export const basicStepSchema = z.object({
  title: z.string().min(1, "Center title is required"),
  description: z.string().min(1, "Description is required"),
  logoImage: z.object(
    { id: z.number(), url: z.string() },
    "Logo image is required",
  ),
  centerImages: z.array(
    z.object({ id: z.number(), url: z.string() }),
    "Center images are required",
  ),
});

export type BasicStepValues = z.infer<typeof basicStepSchema>;
