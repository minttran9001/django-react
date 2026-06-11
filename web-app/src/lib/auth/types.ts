import { User } from "@/features/court-centers/types";

export type CurrentUser = User;

export type MeResponse = {
  user: CurrentUser | null;
};
