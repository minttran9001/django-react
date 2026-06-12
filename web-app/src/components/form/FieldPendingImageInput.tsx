"use client";

import type { FieldPath, FieldValues } from "react-hook-form";

import { PendingImageInput } from "@/components/ui/PendingImageInput";
import type { ImageResource } from "@/features/court-centers/types";

import { FieldShell } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldPendingImageInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value: ImageResource[];
  onChange: (images: ImageResource[]) => void;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  multiple?: boolean;
  disabled?: boolean;
  isUploading?: boolean;
  accept?: string;
};

export function FieldPendingImageInputComponent({
  id,
  label = "",
  description,
  error,
  containerClassName,
  ...inputProps
}: FieldPendingImageInputComponentProps) {
  return (
    <FieldShell error={error} containerClassName={containerClassName}>
      <PendingImageInput
        id={id}
        label={label}
        description={description}
        {...inputProps}
      />
    </FieldShell>
  );
}

type FieldPendingImageInputProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldPendingImageInputComponentProps,
      | "value"
      | "onChange"
      | "error"
      | "invalid"
      | "containerClassName"
    > & {
      multiple?: boolean;
      onValueChange?: (
        value: ImageResource | ImageResource[] | undefined,
      ) => void;
    };

export function FieldPendingImageInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  multiple = false,
  disabled,
  isUploading,
  onUpload,
  onValueChange,
  accept,
}: FieldPendingImageInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  const images = multiple
    ? ((field.value as ImageResource[] | undefined) ?? [])
    : field.value
      ? [field.value as ImageResource]
      : [];

  return (
    <FieldPendingImageInputComponent
      id={id}
      label={label}
      description={description}
      value={images}
      onChange={(nextImages) => {
        const nextValue = multiple
          ? nextImages
          : nextImages[0];
        field.onChange(nextValue);
        onValueChange?.(multiple ? nextImages : nextImages[0]);
      }}
      onUpload={onUpload}
      multiple={multiple}
      disabled={disabled}
      isUploading={isUploading}
      accept={accept}
      error={errorMessage}
      invalid={invalid}
      containerClassName={containerClassName}
    />
  );
}
