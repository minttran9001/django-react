import { User } from "@/features/court-centers/types";

export type CurrentUser = User;

export type MeResponse = {
  user: CurrentUser | null;
};

export type EditProfileRequest = {
  name?: string;
  email: string;
  phone_number?: string;
  address?: string;
  date_of_birth?: string;
  avatar_id?: number | null;
};

export type EditProfileResponse = {
  message: string;
  email_verification_required?: boolean;
};
