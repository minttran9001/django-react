"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";

import { fieldClassName } from "@/components/court-centers/wizard/constants";
import {
  FieldCurrencyInput,
  FieldHiddenInput,
  FieldSelect,
  FieldTextInput,
  FieldTextarea,
  Form,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    updater: (
      current: Record<number, ImageResource[]>,
    ) => Record<number, ImageResource[]>,
  ) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploading: boolean;
  disabled?: boolean;
  onSubmit: (values: CourtsStepValues) => Promise<void>;
  formId: string;
};

type CourtsStepFormProps = {
  form: UseFormReturn<CourtsStepValues>;
  sports: Sport[];
  isLoadingSports: boolean;
  courtImages: Record<number, ImageResource[]>;
  onCourtImagesChange: (
    updater: (
      current: Record<number, ImageResource[]>,
    ) => Record<number, ImageResource[]>,
  ) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploading: boolean;
  disabled?: boolean;
};

const CourtsStepForm = ({ form, sports, isLoadingSports, courtImages, onCourtImagesChange, onUpload, isUploading, disabled }: CourtsStepFormProps) => {
  const { control, setValue, watch, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "courts" });
  const watchedCourts = useWatch({ control, name: "courts" }) ?? [];

  const sportItems = useMemo(
    () =>
      sports.map((sport) => ({
        label: sport.name,
        value: String(sport.id),
      })),
    [sports],
  );

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
              {fields.length > 1 ? (
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
              ) : null}
            </div>

            {watchedCourts[index]?.id ? (
              <FieldHiddenInput<CourtsStepValues>
                name={`courts.${index}.id`}
                valueAsNumber
              />
            ) : null}

            <FieldSelect<CourtsStepValues>
              name={`courts.${index}.sport_id`}
              label="Sport"
              items={sportItems}
              placeholder={
                sports.length === 0 ? "No sports available" : "Select a sport"
              }
              disabled={disabled || isLoadingSports || sports.length === 0}
              valueAsNumber
            />

            <FieldTextInput<CourtsStepValues>
              name={`courts.${index}.title`}
              label="Court name"
              placeholder="Court 1"
              disabled={disabled}
            />

            <FieldTextarea<CourtsStepValues>
              name={`courts.${index}.description`}
              label="Description"
              rows={3}
              placeholder="Indoor court, air-conditioned..."
              disabled={disabled}
              className={cn(fieldClassName, "h-auto min-h-20 py-2")}
            />

            <FieldCurrencyInput<CourtsStepValues>
              name={`courts.${index}.price_per_hour`}
              label="Price per hour"
              currency={
                watchedCourts[index]?.price_per_hour?.currency || "VND"
              }
              disabled={disabled}
            />

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

        {typeof errors.courts?.message === "string" ? (
          <p className="text-sm text-destructive">{errors.courts.message}</p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={disabled || sports.length === 0}
          onClick={() =>
            append({
              sport_id: sports[0]?.id ?? 0,
              title: "",
              description: "",
              price_per_hour: {
                amount: "",
                currency: "",
              },
            })
          }
        >
          <Plus className="size-4" />
          Add another court
        </Button>
      </CardContent>
    </Card>
  );
};

export function CourtsStep({
  defaultValues,
  onSubmit,
  formId,
  ...restProps
}: CourtsStepProps) {
  return (
    <Form schema={courtsStepSchema} defaultValues={defaultValues} onSubmit={onSubmit} id={formId} className="space-y-8">
      {(form) => (
        <CourtsStepForm form={form} {...restProps} />
      )}
    </Form>
  );
}
