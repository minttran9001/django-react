"use client";

import {
  type FieldPath,
  type FieldValues,
  useController,
  useFormContext,
} from "react-hook-form";

export function useFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>(name: TName) {
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ name, control });

  return {
    field,
    errorMessage: fieldState.error?.message,
    invalid: fieldState.invalid,
    id: String(name),
  };
}
