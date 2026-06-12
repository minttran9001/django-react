"use client";

import type { FieldValues } from "react-hook-form";

import MultiSelect from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";
import type { SelectItem } from "./FieldSelect";

export type FieldMultiSelectComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  items: SelectItem[];
  placeholder?: string;
  value: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function FieldMultiSelectComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  className,
  ...selectProps
}: FieldMultiSelectComponentProps) {
  const errorId = getFieldErrorId(id, error);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <div aria-invalid={invalid} aria-describedby={errorId} className={cn(className)}>
        <MultiSelect
          items={selectProps.items}
          value={selectProps.value}
          onChange={selectProps.onChange ?? (() => {})}
          placeholder={selectProps.placeholder}
        />
      </div>
    </FieldShell>
  );
}

type FieldMultiSelectProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldMultiSelectComponentProps,
      | "value"
      | "onChange"
      | "error"
      | "invalid"
      | "label"
      | "description"
      | "containerClassName"
    > & {
      onValueChange?: (value: string[]) => void;
    };

export function FieldMultiSelect<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldMultiSelectProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldMultiSelectComponent
      id={id}
      label={label}
      description={description}
      value={field.value ?? []}
      onChange={(value) => {
        field.onChange(value);
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
