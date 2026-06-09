import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import { AUTH_USER_HEADER, prefetchUser } from "@/lib/auth/fetch-user";

const authRoutes = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = authRoutes.includes(pathname);

  const { user, setCookies } = await prefetchUser(request);

  if (user && isAuthRoute) {
    const response = NextResponse.redirect(new URL("/", request.url));
    setCookies.forEach((c) => response.headers.append("Set-Cookie", c));
    return response;
  }

  if (!user && !isAuthRoute) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(AUTH_USER_HEADER, user ? JSON.stringify(user) : "null");

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (setCookies.length) {
    setCookies.forEach((c) => response.headers.append("Set-Cookie", c));
  } else if (!user) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/register"],
};
