export interface ApiErrorBody {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export type ApiErrorLike = {
  status?: number;
  data?: ApiErrorBody;
};

export const DEFAULT_API_ERROR_MESSAGE = "Something went wrong. Please try again.";

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as ApiErrorBody).message === "string"
  );
}

export function isFetchBaseQueryError(
  error: unknown,
): error is ApiErrorLike & { status: number; data: ApiErrorBody } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "data" in error &&
    isApiErrorBody((error as ApiErrorLike).data)
  );
}

export function getApiErrorBody(error: unknown): ApiErrorBody | null {
  if (isFetchBaseQueryError(error)) {
    return error.data;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    isApiErrorBody((error as ApiErrorLike).data)
  ) {
    return (error as ApiErrorLike).data ?? null;
  }

  return null;
}

export function getApiErrorCode(error: unknown): string | undefined {
  return getApiErrorBody(error)?.code;
}

export function getApiFieldErrors(
  error: unknown,
): Record<string, string[]> | undefined {
  return getApiErrorBody(error)?.errors;
}

export function getApiFieldError(error: unknown, field: string): string | undefined {
  const errors = getApiFieldErrors(error);
  if (!errors) {
    return undefined;
  }

  const direct = errors[field]?.[0];
  if (direct) {
    return direct;
  }

  const nestedKey = Object.keys(errors).find(
    (key) => key === field || key.startsWith(`${field}.`) || key.startsWith(`${field}[`),
  );

  return nestedKey ? errors[nestedKey]?.[0] : undefined;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  const body = getApiErrorBody(error);
  if (body?.message) {
    return body.message;
  }

  return fallback;
}

export function hasApiErrorCode(error: unknown, code: string): boolean {
  return getApiErrorCode(error) === code;
}

export function getFirstApiFieldError(
  error: unknown,
  fields: string[],
  fallback = DEFAULT_API_ERROR_MESSAGE,
): string {
  for (const field of fields) {
    const message = getApiFieldError(error, field);
    if (message) {
      return message;
    }
  }

  return getApiErrorMessage(error, fallback);
}
