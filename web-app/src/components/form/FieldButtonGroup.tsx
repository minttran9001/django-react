"use client";

import type { FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldButtonGroupComponentProps<TOption> = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  options: TOption[];
  value?: TOption | null;
  onChange?: (value: TOption) => void;
  getOptionKey: (option: TOption) => string;
  getOptionLabel: (option: TOption) => string;
  isOptionEqual?: (a: TOption, b: TOption) => boolean;
  emptyMessage?: string;
  columns?: 1 | 2 | 3;
  disabled?: boolean;
  className?: string;
};

export function FieldButtonGroupComponent<TOption>({
  id,
  label,
  description,
  error,
  containerClassName,
  options,
  value,
  onChange,
  getOptionKey,
  getOptionLabel,
  isOptionEqual = (a, b) => getOptionKey(a) === getOptionKey(b),
  emptyMessage = "No options available.",
  columns = 2,
  disabled,
  invalid,
  className,
}: FieldButtonGroupComponentProps<TOption>) {
  const errorId = getFieldErrorId(id, error);
  const gridClassName =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      {options.length > 0 ? (
        <div
          aria-invalid={invalid}
          aria-describedby={errorId}
          className={cn(
            "grid gap-2 rounded-lg",
            invalid && "ring-1 ring-destructive/20",
            gridClassName,
            className,
          )}
        >
          {options.map((option) => {
            const isSelected =
              value !== null &&
              value !== undefined &&
              isOptionEqual(value, option);

            return (
              <Button
                key={getOptionKey(option)}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                className="h-auto py-2 text-xs"
                disabled={disabled}
                onClick={() => onChange?.(option)}
              >
                {getOptionLabel(option)}
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </FieldShell>
  );
}

type FieldButtonGroupProps<
  TFieldValues extends FieldValues,
  TOption,
> = BaseFieldProps<TFieldValues> &
  Omit<
    FieldButtonGroupComponentProps<TOption>,
    | "value"
    | "onChange"
    | "error"
    | "invalid"
    | "label"
    | "description"
    | "containerClassName"
  > & {
    onValueChange?: (value: TOption) => void;
  };

export function FieldButtonGroup<
  TFieldValues extends FieldValues,
  TOption,
>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldButtonGroupProps<TFieldValues, TOption>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldButtonGroupComponent
      id={id}
      label={label}
      description={description}
      value={field.value ?? null}
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
