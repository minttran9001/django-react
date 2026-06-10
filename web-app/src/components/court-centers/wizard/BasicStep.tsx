"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { fieldClassName } from "@/components/court-centers/wizard/constants";
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
  basicStepSchema,
  type BasicStepValues,
} from "@/features/court-centers/schemas/basicStepSchema";
import type { ImageResource } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";

type BasicStepProps = {
  defaultValues: BasicStepValues;
  logoImage: ImageResource[];
  centerImages: ImageResource[];
  onLogoChange: (images: ImageResource[]) => void;
  onCenterImagesChange: (images: ImageResource[]) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploading: boolean;
  disabled?: boolean;
  onSubmit: (values: BasicStepValues) => Promise<void>;
  formId: string;
};

export function BasicStep({
  defaultValues,
  logoImage,
  centerImages,
  onLogoChange,
  onCenterImagesChange,
  onUpload,
  isUploading,
  disabled,
  onSubmit,
  formId,
}: BasicStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BasicStepValues>({
    resolver: zodResolver(basicStepSchema),
    defaultValues,
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
          <CardDescription>
            Name your court center and add photos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Center name</Label>
            <Input
              id="title"
              placeholder="Sunrise Sports Complex"
              aria-invalid={Boolean(errors.title)}
              disabled={disabled}
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
              disabled={disabled}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <PendingImageInput
            label="Logo"
            description="One main photo for your court center."
            value={logoImage}
            onChange={onLogoChange}
            onUpload={onUpload}
            disabled={disabled}
            isUploading={isUploading}
          />

          <PendingImageInput
            label="Listing images"
            description="Additional photos of the venue."
            multiple
            value={centerImages}
            onChange={onCenterImagesChange}
            onUpload={onUpload}
            disabled={disabled}
            isUploading={isUploading}
          />
        </CardContent>
      </Card>
    </form>
  );
}
