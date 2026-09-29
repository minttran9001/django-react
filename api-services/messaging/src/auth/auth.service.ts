import { Injectable } from "@nestjs/common";
import type { IncomingMessage } from "node:http";
import type { Request } from "express";
import jwt from "jsonwebtoken";
import { requireId } from "../common/utils/ids";
import { env } from "../config/env";
import { PrismaService } from "../prisma/prisma.service";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  isActive: boolean;
};

type AccessPayload = {
  user_id?: number | string;
  token_type?: string;
};

export type AuthFailure = "unauthorized" | "email_not_verified";

type RequestWithCookies = Request & { cookies?: Record<string, string> };

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  /** WebSocket auth: inactive users are rejected the same way as a bad token. */
  async authenticateToken(token: string | null): Promise<AuthUser | null> {
    const result = await this.verify(token);
    if (!result.ok) return null;
    return result.user;
  }

  async authenticateHttp(
    token: string | null,
  ): Promise<{ ok: true; user: AuthUser } | { ok: false; reason: AuthFailure }> {
    return this.verify(token);
  }

  extractHttpToken(req: RequestWithCookies): string | null {
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

  extractWsToken(req: IncomingMessage): string | null {
    const cookies = parseCookieHeader(req.headers.cookie);
    if (cookies.access_token) return cookies.access_token;

    const url = new URL(req.url ?? "/", "http://localhost");
    return url.searchParams.get("token");
  }

  private async verify(
    token: string | null,
  ): Promise<{ ok: true; user: AuthUser } | { ok: false; reason: AuthFailure }> {
    if (!token) return { ok: false, reason: "unauthorized" };

    let payload: AccessPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as AccessPayload;
    } catch {
      return { ok: false, reason: "unauthorized" };
    }

    if (payload.token_type && payload.token_type !== "access") {
      return { ok: false, reason: "unauthorized" };
    }
    const userId = Number(payload.user_id);
    if (payload.user_id == null || !Number.isFinite(userId)) {
      return { ok: false, reason: "unauthorized" };
    }

    const user = await this.prisma.authUser.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { ok: false, reason: "unauthorized" };
    }
    if (!user.isActive) {
      return { ok: false, reason: "email_not_verified" };
    }

    return {
      ok: true,
      user: {
        id: requireId(user.id),
        email: user.email,
        username: user.username,
        isActive: user.isActive,
      },
    };
  }
}

function parseCookieHeader(
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
