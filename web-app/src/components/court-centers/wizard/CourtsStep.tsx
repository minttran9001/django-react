"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { fieldClassName } from "@/components/court-centers/wizard/constants";
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
  courtsStepSchema,
  type CourtsStepValues,
} from "@/features/court-centers/schemas/courtsStepSchema";
import type { ImageResource, Sport } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";

type CourtsStepProps = {
  defaultValues: CourtsStepValues;
  sports: Sport[];
  isLoadingSports: boolean;
  courtImages: Record<number, ImageResource[]>;
  onCourtImagesChange: (
    updater: (current: Record<number, ImageResource[]>) => Record<number, ImageResource[]>,
  ) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploading: boolean;
  disabled?: boolean;
  onSubmit: (values: CourtsStepValues) => Promise<void>;
  formId: string;
};

export function CourtsStep({
  defaultValues,
  sports,
  isLoadingSports,
  courtImages,
  onCourtImagesChange,
  onUpload,
  isUploading,
  disabled,
  onSubmit,
  formId,
}: CourtsStepProps) {
  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CourtsStepValues>({
    resolver: zodResolver(courtsStepSchema),
    defaultValues:
      defaultValues.courts.length > 0
        ? defaultValues
        : { courts: [{ sport_id: 0, title: "", description: "" }] },
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
      const sportId = watch(`courts.${index}.sport_id`);
      if (!sportId || sportId === 0) {
        setValue(`courts.${index}.sport_id`, sports[0].id, {
          shouldValidate: false,
        });
      }
    });
  }, [sports, fields, setValue, watch]);

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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
                    disabled={disabled}
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
                  disabled={disabled || isLoadingSports || sports.length === 0}
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
                  disabled={disabled}
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
                  disabled={disabled}
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
                  onCourtImagesChange((current) => ({
                    ...current,
                    [index]: images,
                  }))
                }
                onUpload={onUpload}
                disabled={disabled}
                isUploading={isUploading}
              />
            </div>
          ))}

          {typeof errors.courts?.message === "string" && (
            <p className="text-sm text-destructive">{errors.courts.message}</p>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={disabled || sports.length === 0}
            onClick={() =>
              append({
                sport_id: sports[0]?.id ?? 0,
                title: "",
                description: "",
              })
            }
          >
            <Plus className="size-4" />
            Add another court
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
