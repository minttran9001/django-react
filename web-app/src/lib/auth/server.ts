import { cookies } from "next/headers";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  cookieOptions,
  ACCESS_TOKEN_MAX_AGE,
  REFRESH_TOKEN_MAX_AGE,
} from "@/lib/auth/constants";
import type { CurrentUser } from "@/lib/auth/types";
import { env } from "@/lib/env";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

export function setAuthCookies(
  cookieStore: {
    set: (
      name: string,
      value: string,
      options?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "lax" | "strict" | "none";
        path?: string;
        maxAge?: number;
      },
    ) => void;
  },
  access: string,
  refresh: string,
) {
  cookieStore.set(ACCESS_TOKEN_COOKIE, access, {
    ...cookieOptions,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  cookieStore.set(REFRESH_TOKEN_COOKIE, refresh, {
    ...cookieOptions,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

export function clearAuthCookies(cookieStore: {
  delete: (name: string) => void;
}) {
  cookieStore.delete(ACCESS_TOKEN_COOKIE);
  cookieStore.delete(REFRESH_TOKEN_COOKIE);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { user: CurrentUser };
  return data.user;
}
