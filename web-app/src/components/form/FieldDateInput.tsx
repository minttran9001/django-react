"use client";

import type { Matcher } from "react-day-picker";
import type { FieldValues } from "react-hook-form";

import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldDateInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  disabledDays?: Matcher | Matcher[];
  className?: string;
};

export function FieldDateInputComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  value,
  onChange,
  disabledDays,
  className,
}: FieldDateInputComponentProps) {
  const errorId = getFieldErrorId(id, error);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <Calendar
        mode="single"
        selected={value}
        onSelect={onChange}
        disabled={disabledDays}
        aria-invalid={invalid}
        aria-describedby={errorId}
        className={cn(
          "mx-auto w-full rounded-lg border p-0",
          invalid && "border-destructive ring-destructive/20",
          className,
        )}
      />
    </FieldShell>
  );
}

type FieldDateInputProps<TFieldValues extends FieldValues> = Omit<
  BaseFieldProps<TFieldValues>,
  "disabled"
> &
  Omit<
    FieldDateInputComponentProps,
    | "value"
    | "onChange"
    | "error"
    | "invalid"
    | "label"
    | "description"
    | "containerClassName"
  > & {
    onValueChange?: (date: Date | undefined) => void;
  };

export function FieldDateInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  onValueChange,
  ...props
}: FieldDateInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldDateInputComponent
      id={id}
      label={label}
      description={description}
      value={field.value}
      onChange={(date) => {
        if (!date) {
          return;
        }

        field.onChange(date);
        onValueChange?.(date);
      }}
      error={errorMessage}
      invalid={invalid}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
