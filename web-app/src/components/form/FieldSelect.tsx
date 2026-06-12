"use client";

import type { FieldValues } from "react-hook-form";

import { SelectCore } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type SelectItem = {
  label: string;
  value: string;
};

export type FieldSelectComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  items: SelectItem[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function FieldSelectComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  className,
  ...selectProps
}: FieldSelectComponentProps) {
  const errorId = getFieldErrorId(id, error);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <SelectCore
        className={cn(className)}
        aria-invalid={invalid}
        aria-describedby={errorId}
        {...selectProps}
      />
    </FieldShell>
  );
}

type FieldSelectProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldSelectComponentProps,
      "value" | "onChange" | "error" | "invalid" | "label" | "description" | "containerClassName"
    > & {
      onValueChange?: (value: string) => void;
      valueAsNumber?: boolean;
    };

export function FieldSelect<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  valueAsNumber,
  ...props
}: FieldSelectProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldSelectComponent
      id={id}
      label={label}
      description={description}
      value={field.value != null ? String(field.value) : ""}
      onChange={(value) => {
        const nextValue = valueAsNumber ? Number(value) : value;
        field.onChange(nextValue);
        onValueChange?.(value);
      }}
      error={errorMessage}
      invalid={invalid}
      disabled={disabled}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
