import { isAuthRoute } from "@/lib/routes";

export type LayoutVariant = "auth" | "marketing" | "app" | "full-width";

export type ContentWidth = "full" | "contained";

export type LayoutShellConfig = {
  variant: LayoutVariant;
  contentWidth: ContentWidth;
};

/**
 * Routes that use full-bleed content (edge-to-edge).
 * All other app routes use a centered container with horizontal padding.
 */
export const FULL_WIDTH_ROUTES_WITH_NO_HEADER_SPACING = ["/"] as const;

export const FULL_WIDTH_ROUTES = ["/bookings/calendar"] as const;

export const HORIZONTAL_PADDING_CLASS = "px-4 sm:px-6 lg:px-8";

export const CONTAINED_MAIN_CLASS = `mx-auto w-full max-w-6xl ${HORIZONTAL_PADDING_CLASS}`;

function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export function isFullWidthRouteWithNoHeaderSpacing(pathname: string): boolean {
  return FULL_WIDTH_ROUTES_WITH_NO_HEADER_SPACING.some((route) =>
    matchesRoute(pathname, route),
  );
}

export function isFullWidthRoute(pathname: string): boolean {
  return FULL_WIDTH_ROUTES.some((route) => matchesRoute(pathname, route));
}

export function getLayoutShellConfig(pathname: string): LayoutShellConfig {
  if (isAuthRoute(pathname)) {
    return { variant: "auth", contentWidth: "contained" };
  }

  if (isFullWidthRouteWithNoHeaderSpacing(pathname)) {
    return { variant: "marketing", contentWidth: "full" };
  }

  if (isFullWidthRoute(pathname)) {
    return { variant: "full-width", contentWidth: "full" };
  }

  return { variant: "app", contentWidth: "contained" };
}
