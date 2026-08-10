"use client";

import { Plus, Trash2 } from "lucide-react";
import type { FieldValues, Path } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldShell } from "@/components/form/FieldShell";
import { useFormField } from "@/components/form/hooks/useFormField";
import type { BaseFieldProps } from "@/components/form/types";
import type { RecurrenceRule } from "@/features/booking/schemas/bookingSeriesSchema";
import { endOfMonth, startOfMonth, WEEK_OF_MONTH_OPTIONS } from "@/features/booking/utils/expandSeriesToSlots";
import { DAY_OPTIONS } from "@/features/court-centers/utils/wizard";
import { getDayLabel } from "@/features/court-centers/utils/scheduleCalendar";
import { cn } from "@/lib/utils";
import { Fragment } from "react/jsx-runtime";
import { format, isSameMonth } from "date-fns";

const DEFAULT_RULE: RecurrenceRule = { month: new Date(), weeks: [], days: [] };

type ToggleChipGroupProps<T extends number> = {
  options: { value: T; label: string; hint?: string }[];
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
};

function ToggleChipGroup<T extends number>({
  options,
  value,
  onChange,
  disabled,
}: ToggleChipGroupProps<T>) {
  const toggle = (optionValue: T) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
      return;
    }

    onChange([...value, optionValue]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = value.includes(option.value);

        return (
          <Button
            key={option.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-auto min-w-0 px-2.5 py-1.5 text-xs"
            onClick={() => toggle(option.value)}
            title={option.hint}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}

type MonthlyPatternBuilderProps = {
  value: RecurrenceRule[];
  onChange: (value: RecurrenceRule[]) => void;
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  startDate: Date;
  endDate: Date;
};

export function MonthlyPatternBuilder({
  value,
  onChange,
  error,
  invalid,
  disabled,
  id,
  startDate,
  endDate,
}: MonthlyPatternBuilderProps) {
  const rules = value.length > 0 ? value : [DEFAULT_RULE];

  const updateRule = (month: Date, patch: Partial<RecurrenceRule>) => {
    const existingRule = rules.find((rule) => rule.month.getTime() === month.getTime());
    if (existingRule) {
      onChange(rules.map((rule) =>
        rule.month.getTime() === month.getTime() ? { ...rule, ...patch } : rule,
      ));
    } else {
      onChange([...rules, { month, ...patch }]);
    }
  };

  function getMonthsBetween(startDate: Date, endDate: Date): Date[] {
    const months = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months;
  }
  const months = getMonthsBetween(startDate, endDate);
  const getWeekOptions = (month: Date) => {
    return WEEK_OF_MONTH_OPTIONS.filter((week) => {
      const weekDate = startOfMonth(month);
      weekDate.setDate(weekDate.getDate() + (week.value - 1) * 7);
      const isValid = weekDate.getTime() >= startDate.getTime() && weekDate.getTime() <= endDate.getTime();
      return isValid;
    });
  };

  const getDayOptions = (month: Date) => {
    const today = new Date();
    return DAY_OPTIONS.filter((day) => {
      const monthIsSame = isSameMonth(today, month);
      const startOfMonthDate = monthIsSame ? today : startOfMonth(month);
      const endOfMonthDate = endOfMonth(month);
      const isValid = startOfMonthDate.getDay() <= day.value && endOfMonthDate.getDay() >= day.value;
      return isValid;
    });
  };

  const isWeekSelected = (month: Date) => {
    const rule = value.find((rule) => rule.month.getTime() === month.getTime());
    return (rule?.weeks.length ?? 0) > 0;
  };

  return (
    <FieldShell
      id={id}
      label="Monthly pattern"
      description="Set which weeks and days repeat each month. Add multiple rules for different weeks (e.g. Mon–Tue in weeks 1–2, Thu–Fri in weeks 3–4)."
      error={error}
    >
      <div
        aria-invalid={invalid}
        className={cn(
          "space-y-3 rounded-lg border bg-muted/20 p-3",
          invalid && "border-destructive ring-1 ring-destructive/20",
        )}
      >
        <div
          className="space-y-3 rounded-lg border bg-card p-3 shadow-sm"
        >


          {months.map((month, monthIndex) => {
            return <Fragment key={monthIndex}>
              <div>
                <p className="text-md font-medium text-muted-foreground">{format(month, "MMMM yyyy")}</p>
              </div>
              <div className="space-y-2">
                <ToggleChipGroup
                  options={getWeekOptions(month).map((week) => ({
                    value: week.value,
                    label: week.label,
                    hint: week.hint,
                  }))}
                  value={value.find((rule) => rule.month.getTime() === month.getTime())?.weeks.map((week) => week.week) ?? []}
                  onChange={(weeks) => updateRule(month, { weeks: weeks.map((week) => ({ week, days: [] })) })}
                  disabled={disabled}
                />
              </div>
              {isWeekSelected(month) && <div className="space-y-2 mt-2">
                <p className="text-xs font-medium text-muted-foreground">Days</p>
                <ToggleChipGroup
                  options={getDayOptions(month).map((day) => ({
                    value: day.value,
                    label: getDayLabel(day.value, true),
                  }))}
                />
              </div>}
              {monthIndex < months.length - 1 && <hr className="my-2" />}
            </Fragment>
          })}


        </div>
      </div>
    </FieldShell>
  );
}

type FieldMonthlyPatternBuilderProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> & {
    disabled?: boolean;
    startDate: Date;
    endDate: Date;
  };

export function FieldMonthlyPatternBuilder<
  TFieldValues extends FieldValues,
>({
  name,
  disabled,
  startDate,
  endDate,
}: FieldMonthlyPatternBuilderProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    Path<TFieldValues>
  >(name);

  return (
    <MonthlyPatternBuilder
      id={id}
      value={(field.value as RecurrenceRule[]) ?? []}
      onChange={field.onChange}
      error={errorMessage}
      invalid={invalid}
      disabled={disabled}
      startDate={startDate}
      endDate={endDate}
    />
  );
}
