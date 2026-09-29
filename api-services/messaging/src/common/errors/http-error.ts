import { HttpException } from "@nestjs/common";

export type ApiErrorBody = {
  message: string;
  code: string;
  errors?: Record<string, string[]>;
};

export class HttpError extends HttpException {
  readonly code: string;
  readonly errors?: Record<string, string[]>;

  constructor(
    message: string,
    status = 400,
    code = "bad_request",
    errors?: Record<string, string[]>,
  ) {
    super(message, status);
    this.code = code;
    this.errors = errors;
  }
}
