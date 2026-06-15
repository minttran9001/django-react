import type { BasicStepValues } from "@/features/court-centers/schemas/basicStepSchema";
import type { CourtsStepValues } from "@/features/court-centers/schemas/courtsStepSchema";
import type { LocationStepValues } from "@/features/court-centers/schemas/locationStepSchema";
import type { SchedulesStepValues } from "@/features/court-centers/schemas/schedulesStepSchema";
import type { CourtCenter, ImageResource } from "@/features/court-centers/types";

export const WIZARD_STEPS = [
  { id: 1, label: "Basic" },
  { id: 2, label: "Location" },
  { id: 3, label: "Courts" },
  { id: 4, label: "Availability" },
  { id: 5, label: "Review" },
] as const;

export const DAY_OPTIONS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
] as const;

export function normalizeTime(time: string): string {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

export function centerToBasicValues(center: CourtCenter): BasicStepValues {
  return {
    title: center.title,
    description: center.description ?? "",
  };
}

export function centerToLocationValues(center: CourtCenter): LocationStepValues {
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
        sport_id: court.sport.id,
        title: court.title,
        description: court.description ?? "",
        price_per_hour: {
          amount: court.price_per_hour?.amount != null
            ? String(court.price_per_hour.amount)
            : "",
          currency: court.price_per_hour?.currency ?? "VND",
        },
      })) ?? [],
  };
}

export function centerToSchedulesValues(center: CourtCenter): SchedulesStepValues {
  return {
    courts:
      center.courts?.map((court) => ({
        id: court.id,
        title: court.title,
        schedules:
          court.schedules.length > 0
            ? court.schedules.map((schedule) => ({
                id: schedule.id,
                day_of_week: schedule.day_of_week,
                start_time: normalizeTime(schedule.start_time),
                end_time: normalizeTime(schedule.end_time),
              }))
            : [
                {
                  day_of_week: 0,
                  start_time: "08:00",
                  end_time: "22:00",
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
