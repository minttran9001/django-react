import { cache } from "react";
import { headers } from "next/headers";

import type { CurrentUser } from "@/lib/auth/types";
import { AUTH_USER_HEADER } from "@/lib/auth/fetch-user";

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const headersList = await headers();
  const preloaded = headersList.get(AUTH_USER_HEADER);

  if (preloaded === "null" || !preloaded) {
    return null;
  }

  try {
    return JSON.parse(preloaded) as CurrentUser;
  } catch {
    return null;
  }
});
