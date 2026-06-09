import { z } from "zod";

export const verifyEmailSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(8, "Token must be at least 8 characters long"),
});

export type VerifyEmailFormValues = z.infer<typeof verifyEmailSchema>;
