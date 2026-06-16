"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Matcher } from "react-day-picker";
import type { FieldValues } from "react-hook-form";

import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayLabel } from "@/lib/dates";
import { cn } from "@/lib/utils";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldDateInputVariant = "inline" | "popover";

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
  /** Labels keyed by calendar day. `date` accepts Date, ISO strings, timestamps, etc. */
  dayLabels?: DayLabel[];
  className?: string;
  variant?: FieldDateInputVariant;
  placeholder?: string;
  disabled?: boolean;
  dateFormat?: string;
};

function InlineDateInput({
  id,
  error,
  invalid,
  value,
  onChange,
  disabledDays,
  dayLabels,
  className,
}: Pick<
  FieldDateInputComponentProps,
  | "id"
  | "error"
  | "invalid"
  | "value"
  | "onChange"
  | "disabledDays"
  | "dayLabels"
  | "className"
>) {
  const errorId = getFieldErrorId(id, error);

  return (
    <Calendar
      mode="single"
      selected={value}
      onSelect={onChange}
      disabled={disabledDays}
      dayLabels={dayLabels}
      aria-invalid={invalid}
      aria-describedby={errorId}
      className={cn(
        "mx-auto w-full rounded-lg border p-0",
        invalid && "border-destructive ring-destructive/20",
        className,
      )}
    />
  );
}

function PopoverDateInput({
  id,
  error,
  invalid,
  value,
  onChange,
  disabledDays,
  dayLabels,
  className,
  placeholder = "Pick a date",
  disabled,
  dateFormat = "PPP",
}: Pick<
  FieldDateInputComponentProps,
  | "id"
  | "error"
  | "invalid"
  | "value"
  | "onChange"
  | "disabledDays"
  | "dayLabels"
  | "className"
  | "placeholder"
  | "disabled"
  | "dateFormat"
>) {
  const [open, setOpen] = useState(false);
  const errorId = getFieldErrorId(id, error);
  const displayValue = value ? format(value, dateFormat) : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full", className)}>
          <Input
            id={id}
            readOnly
            disabled={disabled}
            value={displayValue}
            placeholder={placeholder}
            aria-invalid={invalid}
            aria-describedby={errorId}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              "cursor-pointer pr-10",
              !displayValue && "text-muted-foreground",
            )}
          />
          <CalendarIcon
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          disabled={disabledDays}
          dayLabels={dayLabels}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onChange?.(date);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

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
  dayLabels,
  className,
  variant = "inline",
  placeholder,
  disabled,
  dateFormat,
}: FieldDateInputComponentProps) {
  const dateInput =
    variant === "popover" ? (
      <PopoverDateInput
        id={id}
        error={error}
        invalid={invalid}
        value={value}
        onChange={onChange}
        disabledDays={disabledDays}
        dayLabels={dayLabels}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        dateFormat={dateFormat}
      />
    ) : (
      <InlineDateInput
        id={id}
        error={error}
        invalid={invalid}
        value={value}
        onChange={onChange}
        disabledDays={disabledDays}
        dayLabels={dayLabels}
        className={className}
      />
    );

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      {dateInput}
    </FieldShell>
  );
}

type FieldDateInputProps<TFieldValues extends FieldValues> = BaseFieldProps<TFieldValues> &
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
  disabled,
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
      disabled={disabled}
      containerClassName={containerClassName}
      {...props}
    />
  );
}
