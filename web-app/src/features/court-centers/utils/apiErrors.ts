export function getCourtCenterErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    const data = error.data as Record<string, unknown>;

    for (const key of [
      "title",
      "description",
      "latitude",
      "longitude",
      "address",
      "courts",
      "schedules",
      "detail",
      "logo_id",
      "image_ids",
    ]) {
      const value = data[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return "Something went wrong. Please try again.";
}
