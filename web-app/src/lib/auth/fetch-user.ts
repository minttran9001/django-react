import type { NextRequest } from "next/server";

import axios from "axios";

import type { CurrentUser } from "@/lib/auth/types";
import { env } from "@/lib/env";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./constants";

export const AUTH_USER_HEADER = "x-current-user";

const API_URL = `${env.NEXT_PUBLIC_API_URL}/api`;

type AccessTokenPayload = {
  exp?: number;
  user_id?: number;
};

const currentUserNormalizer = (user: CurrentUser) => {
  return {
    id: Number(user.id),
    email: user.email,
  };
};

export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return null;
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(
      base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="),
    );
    return JSON.parse(json) as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function isAccessTokenValid(token: string): boolean {
  const payload = decodeAccessToken(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 > Date.now();
}

export function userFromAccessToken(token: string): CurrentUser | null {
  if (!isAccessTokenValid(token)) {
    return null;
  }

  const payload = decodeAccessToken(token);
  if (!payload?.user_id) {
    return null;
  }

  return currentUserNormalizer({ id: payload.user_id, email: "" });
}

async function getMe(accessToken: string): Promise<CurrentUser | null> {
  try {
    const { data } = await axios.get<{ user: CurrentUser }>(`${API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return data.user ?? null;
  } catch {
    return null;
  }
}

async function refreshAccessToken(
  cookieHeader: string,
): Promise<{ access: string; setCookies: string[] } | null> {
  try {
    // Use native fetch to access Set-Cookie headers from the response,
    // which axios does not expose on its response object.
    const response = await fetch(`${API_URL}/token/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { access?: string };
    if (!data.access) return null;

    const setCookies = response.headers.getSetCookie?.() ?? [];
    return { access: data.access, setCookies };
  } catch {
    return null;
  }
}

export interface PrefetchResult {
  user: CurrentUser | null;
  setCookies: string[];
}

export async function prefetchUser(
  request: NextRequest,
): Promise<PrefetchResult> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) return { user: null, setCookies: [] };

  const user = await getMe(accessToken);
  if (user) return { user, setCookies: [] };

  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return { user: null, setCookies: [] };

  const cookieHeader = request.headers.get("cookie") ?? "";
  const refreshResult = await refreshAccessToken(cookieHeader);
  if (!refreshResult) return { user: null, setCookies: [] };

  const newUser = await getMe(refreshResult.access);
  if (newUser) return { user: newUser, setCookies: refreshResult.setCookies };

  return { user: null, setCookies: [] };
}
