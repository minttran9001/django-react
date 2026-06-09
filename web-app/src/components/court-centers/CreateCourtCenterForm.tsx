"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageFileInput } from "@/components/ui/ImageFileInput";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteLocationInput } from "@/components/location/AutocompleteLocationInput";
import {
  createCourtCenterSchema,
  type CreateCourtCenterFormValues,
} from "@/features/court-centers/schemas/createCourtCenterSchema";
import type { CourtCenter } from "@/features/court-centers/types";
import {
  useCreateCourtCenterMutation,
  useGetSportsQuery,
  useUploadImageMutation,
} from "@/lib/api/courtCenterApi";
import { cn } from "@/lib/utils";

const fieldClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

function getCreateCourtCenterErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    const data = error.data as Record<string, unknown>;

    for (const key of ["title", "description", "latitude", "longitude", "courts", "detail"]) {
      const value = data[key];
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    }
  }

  return "Something went wrong. Please try again.";
}

async function uploadListingImages(
  center: CourtCenter,
  centerLogo: File[],
  centerGallery: File[],
  courtGalleryFiles: Record<number, File[]>,
  uploadImage: ReturnType<typeof useUploadImageMutation>[0],
) {
  if (centerLogo[0]) {
    await uploadImage({
      file: centerLogo[0],
      contentType: "courtcenter",
      objectId: center.id,
      kind: "logo",
    }).unwrap();
  }

  for (const [index, file] of centerGallery.entries()) {
    await uploadImage({
      file,
      contentType: "courtcenter",
      objectId: center.id,
      kind: "gallery",
      sortOrder: index,
    }).unwrap();
  }

  for (const [courtIndex, files] of Object.entries(courtGalleryFiles)) {
    const court = center.courts?.[Number(courtIndex)];
    if (!court) continue;

    for (const [index, file] of files.entries()) {
      await uploadImage({
        file,
        contentType: "court",
        objectId: court.id,
        kind: "gallery",
        sortOrder: index,
      }).unwrap();
    }
  }
}

export function CreateCourtCenterForm() {
  const router = useRouter();
  const { data: sports = [], isLoading: isLoadingSports } = useGetSportsQuery();
  const [createCourtCenter, { isLoading: isCreating, error: createError }] =
    useCreateCourtCenterMutation();
  const [uploadImage, { isLoading: isUploading }] = useUploadImageMutation();
  const [centerLogo, setCenterLogo] = useState<File[]>([]);
  const [centerGallery, setCenterGallery] = useState<File[]>([]);
  const [courtGalleryFiles, setCourtGalleryFiles] = useState<
    Record<number, File[]>
  >({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isLoading = isCreating || isUploading;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateCourtCenterFormValues>({
    resolver: zodResolver(createCourtCenterSchema),
    defaultValues: {
      title: "",
      description: "",
      latitude: "",
      longitude: "",
      courts: [{ sport_id: 0, title: "", description: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "courts",
  });

  useEffect(() => {
    if (sports.length > 0) {
      fields.forEach((_, index) => {
        setValue(`courts.${index}.sport_id`, sports[0].id, {
          shouldValidate: false,
        });
      });
    }
  }, [sports, fields, setValue]);

  const onSubmit = async (values: CreateCourtCenterFormValues) => {
    setUploadError(null);

    try {
      const center = await createCourtCenter({
        title: values.title,
        description: values.description || undefined,
        latitude: values.latitude || undefined,
        longitude: values.longitude || undefined,
        courts: values.courts.map((court) => ({
          sport_id: court.sport_id,
          title: court.title,
          description: court.description || undefined,
        })),
        address: values.address || undefined,
      }).unwrap();

      try {
        await uploadListingImages(
          center,
          centerLogo,
          centerGallery,
          courtGalleryFiles,
          uploadImage,
        );
      } catch {
        setUploadError(
          "Listing created, but some photos failed to upload. You can add them later.",
        );
        router.push("/listings/mine");
        return;
      }

      router.push("/listings/mine");
    } catch {
      // Error state is handled via createError below.
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
            onLocationSelect={(location) => {
              setValue("latitude", location.latitude, { shouldValidate: true });
              setValue("longitude", location.longitude, {
                shouldValidate: true,
              });
              setValue("address", location.address, { shouldValidate: true });
            }}
          />

          <ImageFileInput
            label="Logo"
            description="One main photo for your court center."
            value={centerLogo}
            onChange={setCenterLogo}
            disabled={isLoading}
          />

          <ImageFileInput
            label="Center gallery"
            description="Additional photos of the venue."
            multiple
            value={centerGallery}
            onChange={setCenterGallery}
            disabled={isLoading}
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

              <ImageFileInput
                label="Court photos"
                description="Photos of this specific court."
                multiple
                value={courtGalleryFiles[index] ?? []}
                onChange={(files) =>
                  setCourtGalleryFiles((current) => ({
                    ...current,
                    [index]: files,
                  }))
                }
                disabled={isLoading}
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

      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
        {isLoading ? "Creating listing..." : "Create listing"}
      </Button>

      {uploadError && (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-300">
          {uploadError}
        </p>
      )}

      {createError && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {getCreateCourtCenterErrorMessage(createError)}
        </p>
      )}
    </form>
  );
}
