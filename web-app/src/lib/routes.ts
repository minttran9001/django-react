export const PATHNAME_HEADER = "x-pathname";

export const AUTH_ROUTES = ["/login", "/register", "/verify-email"] as const;

export const PUBLIC_ROUTES = ["/", "/listings"] as const;

export const AUTH_ROUTE_SET = new Set<string>(AUTH_ROUTES);

export const PUBLIC_ROUTE_SET = new Set<string>(PUBLIC_ROUTES);

/** Public listing detail pages: /listings/:id (numeric PK). Owner routes stay protected. */
const PUBLIC_LISTING_DETAIL_RE = /^\/listings\/\d+$/;

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_SET.has(pathname);
}

/**
 * Routes that anonymous users may visit without being redirected to login.
 * Must stay aligned with AllowAny public listing APIs and SEO for detail pages.
 */
export function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_SET.has(pathname) || PUBLIC_LISTING_DETAIL_RE.test(pathname);
}

export type LayoutVariant = "auth" | "marketing" | "app";

/** @deprecated Use getLayoutShellConfig from @/lib/layoutConfig instead */
export function getLayoutVariant(pathname: string): LayoutVariant {
  if (isAuthRoute(pathname)) {
    return "auth";
  }
  if (pathname === "/") {
    return "marketing";
  }
  return "app";
}

/** @deprecated Use getLayoutVariant instead */
export const ROUTE_WITH_NO_LAYOUT_SET = [
  "/login",
  "/register",
  "/verify-email",
  "/",
  "/listings/mine",
  "/listings",
  "/listings/",
  "",
];

/** @deprecated Use getLayoutVariant instead */
export function routeWithNoLayout(pathname: string) {
  return ROUTE_WITH_NO_LAYOUT_SET.find((route) => route.startsWith(pathname));
}
