"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { AutocompleteLocationInput } from "@/components/location/AutocompleteLocationInput";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PendingImageInput } from "@/components/ui/PendingImageInput";
import {
  courtCenterFormSchema,
  formValuesToRequest,
  type CourtCenterFormValues,
} from "@/features/court-centers/schemas/courtCenterFormSchema";
import type { CourtCenter, ImageResource } from "@/features/court-centers/types";
import {
  courtCenterToFormValues,
  courtCenterToImageState,
} from "@/features/court-centers/utils/courtCenterForm";
import {
  useCreateCourtCenterMutation,
  useGetSportsQuery,
  useUpdateCourtCenterMutation,
  useUploadImagesMutation,
} from "@/lib/api/courtCenterApi";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

function getCourtCenterErrorMessage(error: unknown): string {
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
      "courts",
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

type CourtCenterFormProps =
  | {
    mode: "create";
  }
  | {
    mode: "edit";
    listingId: string;
    initialCenter: CourtCenter;
  };

export function CourtCenterForm(props: CourtCenterFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const initialCenter = isEdit ? props.initialCenter : null;
  const initialImages = initialCenter
    ? courtCenterToImageState(initialCenter)
    : null;

  const { data: sports = [], isLoading: isLoadingSports } = useGetSportsQuery();
  const [uploadImages, { isLoading: isUploadingImages }] =
    useUploadImagesMutation();
  const [createCourtCenter, { isLoading: isCreating, error: createError }] =
    useCreateCourtCenterMutation();
  const [updateCourtCenter, { isLoading: isUpdating, error: updateError }] =
    useUpdateCourtCenterMutation();

  const [logoImage, setLogoImage] = useState<ImageResource[]>(
    initialImages?.logoImage ?? [],
  );
  const [centerImages, setCenterImages] = useState<ImageResource[]>(
    initialImages?.centerImages ?? [],
  );
  const [courtImages, setCourtImages] = useState<Record<number, ImageResource[]>>(
    initialImages?.courtImages ?? {},
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isSaving = isCreating || isUpdating || isUploadingImages;
  const submitError = createError ?? updateError;

  const uploadFiles = async (files: File[]) => {
    setUploadError(null);
    try {
      const result = await uploadImages(files).unwrap();
      return result.images;
    } catch {
      setUploadError("Failed to upload images. Please try again.");
      return [];
    }
  };

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CourtCenterFormValues>({
    resolver: zodResolver(courtCenterFormSchema),
    defaultValues: initialCenter
      ? courtCenterToFormValues(initialCenter)
      : {
        title: "",
        description: "",
        latitude: "",
        longitude: "",
        address: "",
        courts: [{ sport_id: 0, title: "", description: "" }],
      },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "courts",
  });

  const watchedCourts = useWatch({ control, name: "courts" }) ?? [];

  useEffect(() => {
    if (sports.length === 0) {
      return;
    }

    fields.forEach((_, index) => {
      const sportId = getValues(`courts.${index}.sport_id`);
      if (!sportId || sportId === 0) {
        setValue(`courts.${index}.sport_id`, sports[0].id, {
          shouldValidate: false,
        });
      }
    });
  }, [sports, fields, setValue, getValues]);

  const onSubmit = async (values: CourtCenterFormValues) => {
    const payload = formValuesToRequest(values, {
      logoId: logoImage[0]?.id,
      centerImageIds: centerImages.map((image) => image.id),
      courtImageIdsByIndex: Object.fromEntries(
        Object.entries(courtImages).map(([index, images]) => [
          index,
          images.map((image) => image.id),
        ]),
      ),
    });

    try {
      if (isEdit) {
        await updateCourtCenter({
          id: props.listingId,
          body: payload,
        }).unwrap();
        router.push(`/listings/${props.listingId}`);
        return;
      }

      await createCourtCenter(payload).unwrap();
      router.push("/listings/mine");
    } catch {
      // Error state is handled via submitError below.
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Court center details</CardTitle>
          <CardDescription>
            Basic information about your venue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Center name</Label>
            <Input
              id="title"
              placeholder="Sunrise Sports Complex"
              aria-invalid={Boolean(errors.title)}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              placeholder="Tell players what makes this center special..."
              className={cn(fieldClassName, "h-auto min-h-24 py-2")}
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <AutocompleteLocationInput
            defaultValue={initialCenter?.address ?? ""}
            onLocationSelect={(location) => {
              setValue("latitude", location.latitude, { shouldValidate: true });
              setValue("longitude", location.longitude, {
                shouldValidate: true,
              });
              setValue("address", location.address, { shouldValidate: true });
            }}
          />

          <PendingImageInput
            label="Logo"
            description="One main photo for your court center."
            value={logoImage}
            onChange={setLogoImage}
            onUpload={uploadFiles}
            disabled={isSaving}
            isUploading={isUploadingImages}
          />

          <PendingImageInput
            label="Listing images"
            description="Additional photos of the venue."
            multiple
            value={centerImages}
            onChange={setCenterImages}
            onUpload={uploadFiles}
            disabled={isSaving}
            isUploading={isUploadingImages}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Courts</CardTitle>
          <CardDescription>
            Add one or more courts available at this center.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="space-y-4 rounded-xl border border-border/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Court {index + 1}</p>
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
              </div>

              {watchedCourts[index]?.id ? (
                <input
                  type="hidden"
                  {...register(`courts.${index}.id`, { valueAsNumber: true })}
                />
              ) : null}

              <div className="space-y-2">
                <Label htmlFor={`courts.${index}.sport_id`}>Sport</Label>
                <select
                  id={`courts.${index}.sport_id`}
                  className={fieldClassName}
                  disabled={isLoadingSports || sports.length === 0}
                  aria-invalid={Boolean(errors.courts?.[index]?.sport_id)}
                  {...register(`courts.${index}.sport_id`, {
                    valueAsNumber: true,
                  })}
                >
                  {sports.length === 0 ? (
                    <option value={0}>No sports available</option>
                  ) : (
                    sports.map((sport) => (
                      <option key={sport.id} value={sport.id}>
                        {sport.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.courts?.[index]?.sport_id && (
                  <p className="text-sm text-destructive">
                    {errors.courts[index]?.sport_id?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`courts.${index}.title`}>Court name</Label>
                <Input
                  id={`courts.${index}.title`}
                  placeholder="Court 1"
                  aria-invalid={Boolean(errors.courts?.[index]?.title)}
                  {...register(`courts.${index}.title`)}
                />
                {errors.courts?.[index]?.title && (
                  <p className="text-sm text-destructive">
                    {errors.courts[index]?.title?.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`courts.${index}.description`}>
                  Description
                </Label>
                <textarea
                  id={`courts.${index}.description`}
                  rows={3}
                  placeholder="Indoor court, air-conditioned..."
                  className={cn(fieldClassName, "h-auto min-h-20 py-2")}
                  {...register(`courts.${index}.description`)}
                />
              </div>

              <PendingImageInput
                label="Court photos"
                description="Photos of this specific court."
                multiple
                value={courtImages[index] ?? []}
                onChange={(images) =>
                  setCourtImages((current) => ({
                    ...current,
                    [index]: images,
                  }))
                }
                onUpload={uploadFiles}
                disabled={isSaving}
                isUploading={isUploadingImages}
              />
            </div>
          ))}

          {errors.courts?.root && (
            <p className="text-sm text-destructive">
              {errors.courts.root.message}
            </p>
          )}
          {typeof errors.courts?.message === "string" && (
            <p className="text-sm text-destructive">{errors.courts.message}</p>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() =>
              append({
                sport_id: sports[0]?.id ?? 0,
                title: "",
                description: "",
              })
            }
            disabled={sports.length === 0}
          >
            <Plus className="size-4" />
            Add another court
          </Button>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSaving} isLoading={isSaving}>
        {isSaving
          ? isEdit
            ? "Saving changes..."
            : "Creating listing..."
          : isEdit
            ? "Save changes"
            : "Create listing"}
      </Button>

      {uploadError && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      {submitError && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {getCourtCenterErrorMessage(submitError)}
        </p>
      )}
    </form>
  );
}
