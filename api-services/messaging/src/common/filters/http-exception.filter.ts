import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { HttpError, type ApiErrorBody } from "../errors/http-error";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== "http") {
      return;
    }

    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpError) {
      const body: ApiErrorBody = {
        message: exception.message,
        code: exception.code,
      };
      if (exception.errors) body.errors = exception.errors;
      response.status(exception.getStatus()).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === "string"
          ? payload
          : Array.isArray((payload as { message?: unknown }).message)
            ? (
                (payload as { message: string[] }).message
              ).join(", ")
            : String(
                (payload as { message?: unknown }).message ??
                  exception.message,
              );
      response.status(status).json({
        message,
        code: status === 401 ? "unauthorized" : "bad_request",
      });
      return;
    }

    this.logger.error(exception);
    response.status(500).json({
      message:
        exception instanceof Error
          ? exception.message
          : "Something went wrong.",
      code: "internal_server_error",
    });
  }
}
