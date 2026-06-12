"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FieldTextInput, FieldTextarea, Form } from "@/components/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PendingImageInput } from "@/components/ui/PendingImageInput";
import {
  basicStepSchema,
  type BasicStepValues,
} from "@/features/court-centers/schemas/basicStepSchema";
import type { ImageResource } from "@/features/court-centers/types";
import { fieldClassName } from "@/components/court-centers/wizard/constants";
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
  const form = useForm<BasicStepValues>({
    resolver: zodResolver(basicStepSchema),
    defaultValues,
  });

  return (
    <Form form={form} onSubmit={onSubmit} id={formId} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic details</CardTitle>
          <CardDescription>
            Name your court center and add photos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldTextInput<BasicStepValues>
            name="title"
            label="Center name"
            placeholder="Sunrise Sports Complex"
            disabled={disabled}
          />

          <FieldTextarea<BasicStepValues>
            name="description"
            label="Description"
            rows={4}
            placeholder="Tell players what makes this center special..."
            className={cn(fieldClassName, "h-auto min-h-24 py-2")}
            disabled={disabled}
          />

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
    </Form>
  );
}
