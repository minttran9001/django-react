import type { BasicStepFormValues } from "@/features/court-centers/schemas/basicStepSchema";
import type { CourtsStepValues } from "@/features/court-centers/schemas/courtsStepSchema";
import type { LocationStepValues } from "@/features/court-centers/schemas/locationStepSchema";
import type { SchedulesStepValues } from "@/features/court-centers/schemas/schedulesStepSchema";
import type {
  CourtCenter,
  ImageResource,
} from "@/features/court-centers/types";

export const WIZARD_STEPS = [
  { id: 1, label: "Basic" },
  { id: 2, label: "Location" },
  { id: 3, label: "Courts" },
  { id: 4, label: "Availability" },
  { id: 5, label: "Review" },
] as const;

export const DAY_OPTIONS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
] as const;

export function normalizeTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export function centerToBasicValues(center: CourtCenter): BasicStepFormValues {
  return {
    title: center.title,
    description: center.description ?? "",
    logoImage: center.logo
      ? { id: center.logo.id, url: center.logo.url }
      : undefined,
    centerImages: center.images.map((image) => ({
      id: image.id,
      url: image.url,
    })),
  };
}

export function centerToLocationValues(
  center: CourtCenter,
): LocationStepValues {
  return {
    latitude: center.latitude ?? "",
    longitude: center.longitude ?? "",
    address: center.address ?? "",
  };
}

export function centerToCourtsValues(center: CourtCenter): CourtsStepValues {
  return {
    courts:
      center.courts?.map((court) => ({
        id: court.id,
        sportId: court.sport.id,
        title: court.title,
        description: court.description ?? "",
        pricePerHour: {
          amount:
            court.pricePerHour?.amount != null
              ? String(court.pricePerHour.amount)
              : "",
          currency: court.pricePerHour?.currency ?? "VND",
        },
      })) ?? [],
  };
}

export function centerToSchedulesValues(
  center: CourtCenter,
): SchedulesStepValues {
  return {
    courts:
      center.courts?.map((court) => ({
        id: court.id,
        title: court.title,
        schedules:
          court.schedules && court.schedules.length > 0
            ? court.schedules.map((schedule) => ({
                id: schedule.id,
                dayOfWeek: schedule.dayOfWeek,
                startTime: normalizeTime(schedule.startTime),
                endTime: normalizeTime(schedule.endTime),
              }))
            : [
                {
                  dayOfWeek: 0,
                  startTime: "08:00",
                  endTime: "22:00",
                },
              ],
      })) ?? [],
  };
}

export function centerToImageState(center: CourtCenter) {
  const courtImages: Record<number, ImageResource[]> = {};

  center.courts?.forEach((court, index) => {
    courtImages[index] = court.images;
  });

  return {
    logoImage: center.logo ? [center.logo] : [],
    centerImages: center.images,
    courtImages,
  };
}
