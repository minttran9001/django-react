"use client";


import { FieldPendingImageInput, FieldTextInput, FieldTextarea, Form } from "@/components/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  basicStepSchema,
  type BasicStepValues,
} from "@/features/court-centers/schemas/basicStepSchema";
import type { ImageResource } from "@/features/court-centers/types";
import { fieldClassName } from "@/components/court-centers/wizard/constants";
import { cn } from "@/lib/utils";

type BasicStepProps = {
  defaultValues: BasicStepValues;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploading: boolean;
  disabled?: boolean;
  onSubmit: (values: BasicStepValues) => Promise<void>;
  formId: string;
};

export function BasicStep({
  defaultValues,
  onUpload,
  isUploading,
  disabled,
  onSubmit,
  formId,
}: BasicStepProps) {
  return (
    <Form schema={basicStepSchema} defaultValues={defaultValues} onSubmit={onSubmit} id={formId} className="space-y-8">
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

          <FieldPendingImageInput
            name="logoImage"
            label="Logo"
            description="One main photo for your court center."
            onUpload={onUpload}
            disabled={disabled}
            isUploading={isUploading}
          />

          <FieldPendingImageInput
            name="centerImages"
            label="Listing images"
            description="Additional photos of the venue."
            multiple
            onUpload={onUpload}
            disabled={disabled}
            isUploading={isUploading}
          />
        </CardContent>
      </Card>
    </Form>
  );
}
