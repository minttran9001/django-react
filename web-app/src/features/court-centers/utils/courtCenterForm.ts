import type { CourtCenter } from "@/features/court-centers/types";
import type { CourtCenterFormValues } from "@/features/court-centers/schemas/courtCenterFormSchema";

export function courtCenterToFormValues(
  center: CourtCenter,
): CourtCenterFormValues {
  return {
    title: center.title,
    description: center.description ?? "",
    latitude: center.latitude ?? "",
    longitude: center.longitude ?? "",
    address: center.address ?? "",
    courts:
      center.courts?.map((court) => ({
        id: court.id,
        sport_id: court.sport.id,
        title: court.title,
        description: court.description ?? "",
      })) ?? [],
  };
}

export function courtCenterToImageState(center: CourtCenter) {
  const courtImages: Record<number, CourtCenter["images"]> = {};

  center.courts?.forEach((court, index) => {
    courtImages[index] = court.images;
  });

  return {
    logoImage: center.logo ? [center.logo] : [],
    centerImages: center.images,
    courtImages,
  };
}
