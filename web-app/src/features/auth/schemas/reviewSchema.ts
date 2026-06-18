import { z } from "zod";

export const requestReviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type RequestReviewFormValues = z.infer<typeof requestReviewSchema>;
