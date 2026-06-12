"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldTextInputComponentProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue"
> & {
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur: React.FocusEventHandler<HTMLInputElement>;
};

export const FieldTextInputComponent = React.forwardRef<
  HTMLInputElement,
  FieldTextInputComponentProps
>(function FieldTextInputComponent(
  {
    id,
    label,
    description,
    error,
    invalid,
    containerClassName,
    className,
    ...inputProps
  },
  ref,
) {
  const errorId = getFieldErrorId(id, error);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <Input
        ref={ref}
        id={id}
        aria-invalid={invalid}
        aria-describedby={errorId}
        className={cn(className)}
        {...inputProps}
      />
    </FieldShell>
  );
});

type FieldTextInputProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldTextInputComponentProps,
      | "value"
      | "onChange"
      | "onBlur"
      | "error"
      | "invalid"
      | "label"
      | "description"
      | "containerClassName"
    > & {
      onValueChange?: (value: string) => void;
    };

export function FieldTextInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldTextInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldTextInputComponent
      id={id}
      name={field.name}
      label={label}
      description={description}
      value={field.value ?? ""}
      onChange={(event) => {
        field.onChange(event);
        onValueChange?.(event.target.value);
      }}
      onBlur={field.onBlur}
      ref={field.ref}
      error={errorMessage}
      invalid={invalid}
      disabled={disabled}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
