"use client";

import * as React from "react";
import type { FieldValues } from "react-hook-form";

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldTextareaComponentProps = Omit<
  React.ComponentProps<typeof Textarea>,
  "value" | "defaultValue"
> & {
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  onBlur: React.FocusEventHandler<HTMLTextAreaElement>;
};

export const FieldTextareaComponent = React.forwardRef<
  HTMLTextAreaElement,
  FieldTextareaComponentProps
>(function FieldTextareaComponent(
  {
    id,
    label,
    description,
    error,
    invalid,
    containerClassName,
    className,
    ...textareaProps
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
      <Textarea
        ref={ref}
        id={id}
        aria-invalid={invalid}
        aria-describedby={errorId}
        className={cn(className)}
        {...textareaProps}
      />
    </FieldShell>
  );
});

type FieldTextareaProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
  Omit<
    FieldTextareaComponentProps,
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

export function FieldTextarea<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldTextareaProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldTextareaComponent
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
