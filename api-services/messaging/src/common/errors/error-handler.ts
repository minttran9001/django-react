import type { NextFunction, Request, Response } from "express";
import { HttpError, sendError } from "./http-error.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return sendError(res, err.message, err.status, err.code, err.errors);
  }
  console.error(err);
  return sendError(
    res,
    err instanceof Error ? err.message : "Something went wrong.",
    500,
    "internal_server_error",
  );
}
