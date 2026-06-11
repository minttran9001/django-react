import { z } from "zod";

export const editProfileSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email address"),
    phone_number: z.string().min(1, "Phone number is required"),
    address: z.string().min(1, "Address is required"),
    date_of_birth: z.string().min(1, "Date of birth is required"),
    avatar: z
      .object({
        id: z.number().optional(),
        url: z.string().optional(),
        public_id: z.string().optional(),
      })
      .optional(),
  })
  .refine((data) => data.avatar?.id, {
    path: ["avatar"],
    message: "Avatar is required",
  });

export type EditProfileFormValues = z.infer<typeof editProfileSchema>;
