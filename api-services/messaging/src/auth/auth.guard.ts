import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { HttpError } from "../common/errors/http-error";
import { AuthService, type AuthUser } from "./auth.service";

export type AuthenticatedRequest = Request & {
  cookies?: Record<string, string>;
  user?: AuthUser;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const result = await this.authService.authenticateHttp(
      this.authService.extractHttpToken(req),
    );

    if (!result.ok) {
      if (result.reason === "email_not_verified") {
        throw new HttpError(
          "Email not verified. Check your inbox.",
          401,
          "email_not_verified",
        );
      }
      throw new HttpError("Authentication required.", 401, "unauthorized");
    }

    req.user = result.user;
    return true;
  }
}
