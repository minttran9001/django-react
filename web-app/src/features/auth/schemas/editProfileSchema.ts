import { z } from "zod";

export const editProfileSchema = z.object({
  name: z.string().optional(),
  email: z.email("Invalid email address"),
  phone_number: z.string().optional(),
  address: z.string().optional(),
  date_of_birth: z.string().optional(),
  avatar: z
    .object({
      id: z.number().optional(),
      url: z.string().optional(),
      public_id: z.string().optional(),
    })
    .optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
