export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// Match Django SIMPLE_JWT settings
export const ACCESS_TOKEN_MAX_AGE = 30 * 60;
export const REFRESH_TOKEN_MAX_AGE = 24 * 60 * 60;

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};
