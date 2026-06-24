import { z } from "zod";

const imageResourceSchema = z.object({
  id: z.number(),
  url: z.string(),
});

type ImageResourceValue = z.infer<typeof imageResourceSchema>;

export const basicStepSchema = z
  .object({
    title: z.string().min(1, "Center title is required"),
    description: z.string().min(1, "Description is required"),
    logoImage: imageResourceSchema.nullish(),
    centerImages: z.array(imageResourceSchema),
  })
  .superRefine((data, ctx) => {
    if (
      data.logoImage == null ||
      data.logoImage.id <= 0 ||
      data.logoImage.url.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["logoImage"],
        message: "Logo image is required",
      });
    }

    if (data.centerImages.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["centerImages"],
        message: "Add at least one listing image",
      });
    }
  });

/** Values while the form is being edited (logo may be empty). */
export type BasicStepFormValues = z.infer<typeof basicStepSchema>;

/** Values after successful validation/submit. */
export type BasicStepValues = {
  title: string;
  description: string;
  logoImage: ImageResourceValue;
  centerImages: ImageResourceValue[];
};

export const emptyBasicStepFormValues: BasicStepFormValues = {
  title: "",
  description: "",
  logoImage: undefined,
  centerImages: [],
};
