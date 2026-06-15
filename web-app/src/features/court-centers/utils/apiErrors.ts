import {
  getApiErrorMessage,
  getFirstApiFieldError,
} from "@/lib/api/errors";

export type { ApiErrorBody, ApiErrorLike } from "@/lib/api/errors";
export {
  DEFAULT_API_ERROR_MESSAGE,
  getApiErrorBody,
  getApiErrorCode,
  getApiErrorMessage,
  getApiFieldError,
  getApiFieldErrors,
  getFirstApiFieldError,
  hasApiErrorCode,
  isApiErrorBody,
  isFetchBaseQueryError,
} from "@/lib/api/errors";

/** @deprecated Use getApiErrorMessage or getFirstApiFieldError from `@/lib/api/errors` instead. */
export function getCourtCenterErrorMessage(error: unknown): string {
  return getFirstApiFieldError(
    error,
    [
      "title",
      "description",
      "latitude",
      "longitude",
      "address",
      "courts",
      "schedules",
      "logo_id",
      "image_ids",
    ],
    getApiErrorMessage(error),
  );
}
