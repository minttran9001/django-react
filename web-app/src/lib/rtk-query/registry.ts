import { authApi } from "@/lib/api/authApi";
import { courtCenterApi } from "@/lib/api/courtCenterApi";

export const rtkQueryRegistry = {
  authApi,
  courtCenterApi,
} as const;

export type RtkQueryApiId = keyof typeof rtkQueryRegistry;
