import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { requireId } from "../common/utils/ids.js";
import { sendError } from "../common/errors/http-error.js";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  isActive: boolean;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type AccessPayload = {
  user_id?: number | string;
  token_type?: string;
};

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const cookie = req.cookies?.access_token;
  if (typeof cookie === "string" && cookie.length > 0) {
    return cookie;
  }
  return null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = extractToken(req);
    if (!token) {
      return sendError(res, "Authentication required.", 401, "unauthorized");
    }

    let payload: AccessPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as AccessPayload;
    } catch {
      return sendError(res, "Authentication required.", 401, "unauthorized");
    }

    if (payload.token_type && payload.token_type !== "access") {
      return sendError(res, "Authentication required.", 401, "unauthorized");
    }

    const userIdRaw = payload.user_id;
    if (userIdRaw == null) {
      return sendError(res, "Authentication required.", 401, "unauthorized");
    }

    const user = await prisma.authUser.findUnique({
      where: { id: BigInt(userIdRaw) },
    });
    if (!user) {
      return sendError(res, "Authentication required.", 401, "unauthorized");
    }
    if (!user.isActive) {
      return sendError(
        res,
        "Email not verified. Check your inbox.",
        401,
        "email_not_verified",
      );
    }

    req.user = {
      id: requireId(user.id),
      email: user.email,
      username: user.username,
      isActive: user.isActive,
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

export async function authenticateToken(
  token: string | null,
): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as AccessPayload;
    if (payload.token_type && payload.token_type !== "access") return null;
    if (payload.user_id == null) return null;
    const user = await prisma.authUser.findUnique({
      where: { id: BigInt(payload.user_id) },
    });
    if (!user || !user.isActive) return null;
    return {
      id: requireId(user.id),
      email: user.email,
      username: user.username,
      isActive: user.isActive,
    };
  } catch {
    return null;
  }
}

export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}
