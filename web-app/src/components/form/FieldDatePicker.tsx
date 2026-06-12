"use client";

import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import type { FieldValues } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatApiDate, parseApiDate } from "@/lib/dates";

import { FieldShell, getFieldErrorId } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldDatePickerComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value?: string;
  onChange?: (value: string | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function FieldDatePickerComponent({
  id,
  label,
  description,
  error,
  invalid,
  containerClassName,
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
}: FieldDatePickerComponentProps) {
  const errorId = getFieldErrorId(id, error);
  const date = parseApiDate(value);

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            data-empty={!date}
            aria-invalid={invalid}
            aria-describedby={errorId}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              invalid && "border-destructive",
              className,
            )}
          >
            <CalendarIcon />
            {date ? format(date, "PPP") : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(nextDate) =>
              onChange?.(nextDate ? formatApiDate(nextDate) : undefined)
            }
          />
        </PopoverContent>
      </Popover>
    </FieldShell>
  );
}

type FieldDatePickerProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
    Omit<
      FieldDatePickerComponentProps,
      | "value"
      | "onChange"
      | "error"
      | "invalid"
      | "label"
      | "description"
      | "containerClassName"
    > & {
      onValueChange?: (value: string | undefined) => void;
    };

export function FieldDatePicker<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldDatePickerProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  return (
    <FieldDatePickerComponent
      id={id}
      label={label}
      description={description}
      value={field.value}
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
