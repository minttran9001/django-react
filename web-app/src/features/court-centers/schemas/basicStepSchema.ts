import { z } from "zod";

export const basicStepSchema = z.object({
  title: z.string().min(1, "Center title is required"),
  description: z.string().min(1, "Description is required"),
});

export type BasicStepValues = z.infer<typeof basicStepSchema>;
