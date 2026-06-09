import { z } from "zod";

const courtInputSchema = z.object({
  id: z.number().int().positive().optional(),
  sport_id: z.number().int().positive("Select a sport"),
  title: z.string().min(1, "Court title is required"),
  description: z.string().optional(),
});

export const courtCenterFormSchema = z
  .object({
    title: z.string().min(1, "Center title is required"),
    description: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    address: z.string().optional(),
    courts: z.array(courtInputSchema).min(1, "Add at least one court"),
  })
  .refine(
    (data) => {
      return data.latitude && data.longitude && data.address;
    },
    {
      path: ["latitude", "longitude", "address"],
      message: "Location is required",
    },
  );

export type CourtCenterFormValues = z.infer<typeof courtCenterFormSchema>;

export type CourtCenterFormInput = {
  title: string;
  description?: string;
  latitude?: string;
  longitude?: string;
  address?: string;
  logo_id?: number;
  image_ids?: number[];
  courts: Array<{
    id?: number;
    sport_id: number;
    title: string;
    description?: string;
    image_ids?: number[];
  }>;
};

export function formValuesToRequest(
  values: CourtCenterFormValues,
  images: {
    logoId?: number;
    centerImageIds: number[];
    courtImageIdsByIndex: Record<number, number[]>;
  },
): CourtCenterFormInput {
  return {
    title: values.title,
    description: values.description || undefined,
    latitude: values.latitude || undefined,
    longitude: values.longitude || undefined,
    address: values.address || undefined,
    logo_id: images.logoId,
    image_ids: images.centerImageIds,
    courts: values.courts.map((court, index) => ({
      id: court.id,
      sport_id: court.sport_id,
      title: court.title,
      description: court.description || undefined,
      image_ids: images.courtImageIdsByIndex[index] ?? [],
    })),
  };
}
