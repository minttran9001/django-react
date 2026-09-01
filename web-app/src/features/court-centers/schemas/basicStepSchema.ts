import { z } from "zod";

const imageResourceSchema = z.object({
  id: z.number().positive(),
  url: z.string().min(1),
});

export const basicStepSchema = z.object({
  title: z.string().min(1, "Center title is required"),
  description: z.string().min(1, "Description is required"),
  logoImage: imageResourceSchema,
  centerImages: z.array(imageResourceSchema),
});

export type BasicStepValues = z.infer<typeof basicStepSchema>;
