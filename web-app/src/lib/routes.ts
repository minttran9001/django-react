export const PATHNAME_HEADER = "x-pathname";

export const AUTH_ROUTES = ["/login", "/register", "/verify-email"] as const;

export const PUBLIC_ROUTES = ["/", "/listings"] as const;

export const AUTH_ROUTE_SET = new Set<string>(AUTH_ROUTES);

export const PUBLIC_ROUTE_SET = new Set<string>(PUBLIC_ROUTES);

export function isAuthRoute(pathname: string) {
  return AUTH_ROUTE_SET.has(pathname);
}

export const ROUTE_WITH_NO_LAYOUT_SET = new Set<string>([
  "/login",
  "/register",
  "/verify-email",
  "/",
  "/listings/mine",
  "listings",
]);

export function routeWithNoLayout(pathname: string) {
  return ROUTE_WITH_NO_LAYOUT_SET.has(pathname);
}
