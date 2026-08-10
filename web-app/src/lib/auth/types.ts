import { User } from "@/features/court-centers/types";

export type CurrentUser = User;

export type MeResponse = {
  user: CurrentUser | null;
};

export type EditProfileRequest = {
  name?: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  dateOfBirth?: string;
  avatarId?: number | null;
};

export type EditProfileResponse = {
  message: string;
  emailVerificationRequired?: boolean;
};
