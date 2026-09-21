import type { Response } from "express";

export type ApiErrorBody = {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
};

export class HttpError extends Error {
  status: number;
  code: string;
  errors?: Record<string, string[]>;

  constructor(
    message: string,
    status = 400,
    code = "bad_request",
    errors?: Record<string, string[]>,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export function sendError(
  res: Response,
  message: string,
  status = 400,
  code = "bad_request",
  errors?: Record<string, string[]>,
) {
  const body: ApiErrorBody = { message, code };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}
