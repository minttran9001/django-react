"use client";

import { DollarSign } from "lucide-react";
import type { FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Money } from "@/lib/types/money";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldCurrencyInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value: Money;
  onChange?: (value: Money) => void;
  currency?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

export function FieldCurrencyInputComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  value,
  onChange,
  currency,
  disabled,
  className,
  placeholder = "0.00",
}: FieldCurrencyInputComponentProps) {
  const errorId = getFieldErrorId(id, error);
  const displayCurrency = currency ?? value.currency;

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <div className="relative">
        <DollarSign className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type="number"
          min="0"
          step="0.01"
          disabled={disabled}
          placeholder={placeholder}
          aria-invalid={invalid}
          aria-describedby={errorId}
          className={cn("bg-background pl-9", className)}
          value={value.amount}
          onChange={(event) =>
            onChange?.({
              amount: event.target.value,
              currency: displayCurrency,
            })
          }
        />
      </div>
      {displayCurrency ? (
        <p className="text-xs text-muted-foreground">
          Enter amount in {displayCurrency}
        </p>
      ) : null}
    </FieldShell>
  );
}

type FieldCurrencyInputProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldCurrencyInputComponentProps,
      | "value"
      | "onChange"
      | "error"
      | "invalid"
      | "label"
      | "description"
      | "containerClassName"
    > & {
      onValueChange?: (value: Money) => void;
    };

export function FieldCurrencyInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  currency,
  onValueChange,
  ...props
}: FieldCurrencyInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldCurrencyInputComponent
      id={id}
      label={label}
      description={description}
      value={field.value ?? { amount: "", currency: currency ?? "VND" }}
      onChange={(value) => {
        field.onChange(value);
        onValueChange?.(value);
      }}
      currency={currency}
      error={errorMessage}
      invalid={invalid}
      disabled={disabled}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
