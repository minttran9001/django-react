"use client";

import { StarIcon } from "lucide-react";
import * as React from "react";
import type { FieldValues } from "react-hook-form";

import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldRatingInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  options: number[];
  value?: number | null;
  onChange?: (value: number) => void;
  disabled?: boolean;
};

export function FieldRatingInputComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  options,
  value,
  onChange,
  disabled,
}: FieldRatingInputComponentProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const errorId = getFieldErrorId(id, error);
  const active = hovered ?? value ?? 0;

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <div
        role="radiogroup"
        aria-invalid={invalid}
        aria-describedby={errorId}
        className="flex gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {options.map((option) => {
          const filled = option <= active;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={option === value}
              aria-label={`${option} star${option !== 1 ? "s" : ""}`}
              disabled={disabled}
              onClick={() => onChange?.(option)}
              onMouseEnter={() => setHovered(option)}
              className={cn(
                "rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
              )}
            >
              <StarIcon
                className={cn(
                  "size-7 transition-colors",
                  filled
                    ? "fill-yellow-400 stroke-yellow-400"
                    : "fill-transparent stroke-muted-foreground",
                )}
              />
            </button>
          );
        })}
      </div>
    </FieldShell>
  );
}

type FieldRatingInputProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldRatingInputComponentProps,
      "value" | "onChange" | "error" | "invalid" | "label" | "description" | "containerClassName"
    > & {
      onValueChange?: (value: number) => void;
    };

export function FieldRatingInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldRatingInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldRatingInputComponent
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
