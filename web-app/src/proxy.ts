import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import {
  AUTH_ROUTE_SET,
  PATHNAME_HEADER,
  PUBLIC_ROUTE_SET,
} from "@/lib/routes";
import { AUTH_USER_HEADER, prefetchUser } from "@/lib/auth/fetch-user";
import { CurrentUser } from "./lib/auth/types";

function isProtectedRoute(pathname: string) {
  return !AUTH_ROUTE_SET.has(pathname) && !PUBLIC_ROUTE_SET.has(pathname);
}

function clearTokens(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}

function forwardCookies(response: NextResponse, setCookies: string[]) {
  setCookies.forEach((c) => response.headers.append("Set-Cookie", c));
}

const shouldRedirectToLogin = (
  user: CurrentUser | null,
  pathname: string,
) => {
  return !user && isProtectedRoute(pathname);
};

const shouldRedirectToHome = (
  user: CurrentUser | null,
  isAuthRoute: boolean,
) => {
  return user && isAuthRoute;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTE_SET.has(pathname);

  const { user, setCookies } = await prefetchUser(request);

  // Authenticated user on login/register → send to home
  if (shouldRedirectToHome(user, isAuthRoute)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    forwardCookies(response, setCookies);
    return response;
  }

  // Unauthenticated user on a protected route → send to login and delete the access and refresh tokens
  if (shouldRedirectToLogin(user, pathname)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearTokens(response);
    return response;
  }

  // Pass through: attach user to request headers for layout/server components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  requestHeaders.set(AUTH_USER_HEADER, user ? JSON.stringify(user) : "null");

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  //if there are set cookies, forward them (after a refresh BE service will send a set-cookie header)
  if (setCookies.length) {
    forwardCookies(response, setCookies);
  } else if (!user) {
    //if user is not authenticated and there are no set cookies, delete the access and refresh tokens
    clearTokens(response);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
