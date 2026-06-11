import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/constants";
import {
  AUTH_USER_HEADER,
  isAccessTokenValid,
  prefetchUser,
  userFromAccessToken,
} from "@/lib/auth/fetch-user";
import type { CurrentUser } from "@/lib/auth/types";
import {
  AUTH_ROUTE_SET,
  PATHNAME_HEADER,
  PUBLIC_ROUTE_SET,
} from "@/lib/routes";

function isProtectedRoute(pathname: string) {
  return !AUTH_ROUTE_SET.has(pathname) && !PUBLIC_ROUTE_SET.has(pathname);
}

function isClientNavigation(request: NextRequest) {
  return request.headers.get("RSC") === "1";
}

function clearTokens(response: NextResponse) {
  response.cookies.delete(ACCESS_TOKEN_COOKIE);
  response.cookies.delete(REFRESH_TOKEN_COOKIE);
}

function forwardCookies(response: NextResponse, setCookies: string[]) {
  setCookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));
}

function buildPassThrough(
  request: NextRequest,
  pathname: string,
  user: CurrentUser | null,
  setCookies: string[] = [],
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(PATHNAME_HEADER, pathname);
  requestHeaders.set(AUTH_USER_HEADER, user ? JSON.stringify(user) : "null");

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (setCookies.length) {
    forwardCookies(response, setCookies);
  } else if (!user) {
    clearTokens(response);
  }

  return response;
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
  return Boolean(user) && isAuthRoute;
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = AUTH_ROUTE_SET.has(pathname);
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isClientNav = isClientNavigation(request);

  // Client navigations: JWT check only — profile data comes from RTK getMe cache.
  if (isClientNav) {
    const user =
      accessToken && isAccessTokenValid(accessToken)
        ? userFromAccessToken(accessToken)
        : null;

    if (shouldRedirectToHome(user, isAuthRoute)) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!accessToken && shouldRedirectToLogin(null, pathname)) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      clearTokens(response);
      return response;
    }

    if (!shouldRedirectToLogin(user, pathname)) {
      return buildPassThrough(request, pathname, user);
    }
  }

  // Full page load: fetch full user from /me (with refresh fallback).
  const { user, setCookies } = await prefetchUser(request);

  if (shouldRedirectToHome(user, isAuthRoute)) {
    const response = NextResponse.redirect(new URL("/", request.url));
    forwardCookies(response, setCookies);
    return response;
  }

  if (shouldRedirectToLogin(user, pathname)) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    clearTokens(response);
    return response;
  }

  return buildPassThrough(request, pathname, user, setCookies);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
