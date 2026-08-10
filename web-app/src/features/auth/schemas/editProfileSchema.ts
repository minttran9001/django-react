import { z } from "zod";

export const editProfileSchema = z.object({
  name: z.string().optional(),
  email: z.email("Invalid email address"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().optional(),
  avatar: z
    .object({
      id: z.number().optional(),
      url: z.string().optional(),
      publicId: z.string().optional(),
    })
    .optional(),
});

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
