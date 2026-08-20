"use client";

import type { FieldValues, Path } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { FieldShell } from "@/components/form/FieldShell";
import { useFormField } from "@/components/form/hooks/useFormField";
import type { BaseFieldProps } from "@/components/form/types";
import type { RecurrenceRule } from "@/features/booking/schemas/bookingSeriesSchema";
import { endOfMonth, startOfMonth } from "@/features/booking/utils/expandSeriesToSlots";
import { cn } from "@/lib/utils";
import { Fragment } from "react/jsx-runtime";
import { addDays, format, isBefore, isAfter, min, max, startOfWeek, addMonths, getDay, isSameDay, isSameMonth } from "date-fns";
import { VariantProps } from "class-variance-authority";
import { AvailableSlot } from "@/features/court-centers/types";

const DEFAULT_RULE: RecurrenceRule = { month: new Date(), weeks: [{ week: 1, days: [] }] };

type ToggleChipGroupOption<T extends number> = { value: T; label: string; hint?: string, children?: React.ReactNode, disabled?: boolean };
type ToggleChipGroupOptionWithDisabledFn<T extends number> = ToggleChipGroupOption<T> & { disabledFn?: (option: ToggleChipGroupOption<T>) => boolean };


type ToggleChipGroupProps<T extends number> = {
  options: ToggleChipGroupOptionWithDisabledFn<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  disabled?: boolean;
  selectedColorVariants?: VariantProps<typeof buttonVariants>["variant"];
  className?: string;
  itemClassName?: string;
};

function ToggleChipGroup<T extends number>({
  options,
  value,
  onChange,
  disabled,
  selectedColorVariants = "default",
  className,
  itemClassName,
}: ToggleChipGroupProps<T>) {
  const toggle = (optionValue: T) => {
    if (value.includes(optionValue)) {
      onChange(value.filter((item) => item !== optionValue));
      return;
    }

    onChange([...value, optionValue]);
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);

        return (
          <div key={option.value} className={itemClassName}>
            <Button
              type="button"
              variant={isSelected ? selectedColorVariants : "outline"}
              size="sm"
              disabled={option.disabledFn ? option.disabledFn(option) : option.disabled ?? disabled}
              className="h-auto min-w-0 px-2.5 py-1.5 text-xs"
              onClick={() => toggle(option.value)}
              title={option.hint}
            >
              {option.label}
            </Button>
            {option.children}
          </div>
        );
      })}
    </div>
  );
}

const DayToggleChipGroup = ({ className, options, onChange, value, selectedColorVariants = "default", disabled }: { className?: string, options: ToggleChipGroupOptionWithDisabledFn<number>[], onChange: (days: number[]) => void, value: number[], selectedColorVariants?: VariantProps<typeof buttonVariants>["variant"], disabled?: boolean }) => {

  return (
    <div className={cn("space-y-2 mt-2", className)}>
      <ToggleChipGroup
        options={options}
        value={value || []}
        onChange={onChange}
        selectedColorVariants={selectedColorVariants}
        disabled={disabled}
      />
    </div>
  );
};

type MonthlyPatternBuilderProps = {
  value: RecurrenceRule[];
  onChange: (value: RecurrenceRule[]) => void;
  error?: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
  startDate: Date;
  endDate: Date;
  availableSlots: AvailableSlot[];
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
  availableSlots,
}: MonthlyPatternBuilderProps) {
  const rules = value.length > 0 ? value : [DEFAULT_RULE];
  const onToggleWeek = (month: Date, weeks: number[]) => {
    const existingRule = rules.find((rule) => rule.month.getTime() === month.getTime());
    if (existingRule) {
      const newRules = rules.map((rule) =>
        rule.month.getTime() === month.getTime() ? { ...rule, weeks: weeks.map((week) => ({ week, days: getSelectedDays(month, { value: week, label: `Week ${week}`, hint: `Week ${week}` }) })) } : rule,
      );
      onChange(newRules);
    } else {
      const newRules = [...rules, { month, weeks: weeks.map((week) => ({ week, days: [] })) }];
      onChange(newRules);
    }
  };

  function getMonthsBetween(startDate: Date, endDate: Date): Date[] {
    const months = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate = startOfMonth(addMonths(currentDate, 1));
    }
    return months;
  }
  const months = getMonthsBetween(startDate, endDate);

  const getWeekOptions = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // First Sunday of the calendar week containing the first day of month
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 0 });

    const weeks: {
      value: number;
      label: string;
      hint: string;
      days: { value: number; label: string }[];
      weekStart: Date;
      weekEnd: Date;
    }[] = [];

    let weekIndex = 1;

    while (weekStart <= monthEnd) {
      const weekEnd = addDays(weekStart, 6);

      // Clip the week to the selected booking range
      const visibleStart = max([max([weekStart, monthStart]), startDate]);
      const visibleEnd = min([min([weekEnd, monthEnd]), endDate]);
      // Does this calendar week overlap the selected range?
      const isValid =
        !isAfter(visibleStart, visibleEnd) &&
        !isAfter(weekStart, endDate) &&
        !isBefore(weekEnd, startDate);

      if (isValid) {
        const hint = visibleStart.getTime() === visibleEnd.getTime() ? `Day ${format(visibleStart, "d")}` : `Days ${format(visibleStart, "d")}–${format(
          visibleEnd,
          "d",
        )}`;

        const days: { value: number; label: string }[] = [];
        let currentDate = visibleStart;
        while (currentDate <= visibleEnd) {
          const day = getDay(currentDate);
          if (!days.find((d) => d.value === day)) {
            days.push({
              value: day,
              label: format(currentDate, "EEE"),
            });
          }
          currentDate = addDays(currentDate, 1);
        }

        weeks.push({
          value: weekIndex,
          label: `Week ${weekIndex} (${hint})`,
          hint,
          days,
          weekStart,
          weekEnd,
        });
      }

      weekStart = addDays(weekStart, 7);
      weekIndex++;
    }
    return weeks;
  };


  const getSelectedDays = (month: Date, week: { value: number; label: string; hint: string }) => {
    const rule = value.find((rule) => rule.month.getTime() === month.getTime());
    const weekRule = rule?.weeks.find((ruleWeek) => ruleWeek.week === week.value)
    return weekRule?.days ?? [];
  };


  const isWeekSelected = (month: Date, week: { value: number; label: string; hint: string }) => {
    const rule = value.find((rule) => rule.month.getTime() === month.getTime());
    return rule?.weeks.find((ruleWeek) => ruleWeek.week === week.value) ? true : false;
  };

  const onUpdateWeekDays = (month: Date, week: { value: number; label: string; hint: string }, days: number[]) => {
    const existingRule = rules.find((rule) => rule.month.getTime() === month.getTime());
    let newRules: RecurrenceRule[] = rules;
    if (existingRule) {
      newRules = newRules.map((rule) => rule.month.getTime() === month.getTime() ? { ...rule, weeks: rule.weeks.map((ruleWeek) => ruleWeek.week === week.value ? { ...ruleWeek, days } : ruleWeek) } : rule);
    } else {
      newRules = [...rules, { month, weeks: [{ week: week.value, days }] }];
    }
    onChange(newRules);
  };


  const isDayOfWeekDisabled = (week: { value: number; label: string; hint: string; weekStart: Date; weekEnd: Date }, day: { value: number; label: string }) => {
    return !availableSlots.some((slot) => {
      return isSameDay(slot.date, addDays(week.weekStart, day.value))
    });
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
              <div className="space-y-3">
                <ToggleChipGroup
                  disabled={disabled || !availableSlots.some((slot) => {
                    return isSameDay(slot.date, month)
                  })}
                  itemClassName="border-b py-3 w-full"
                  options={getWeekOptions(month).map((week) => ({
                    value: week.value,
                    label: week.label,
                    hint: week.hint,
                    children: <DayToggleChipGroup disabled={disabled} options={week.days.map((day) => ({
                      value: day.value,
                      label: day.label,
                      disabledFn: (day) => isDayOfWeekDisabled(week, day),
                    }))} value={getSelectedDays(month, week)} onChange={(days) => onUpdateWeekDays(month, week, days)} selectedColorVariants={'secondary'} />,
                  }))}
                  value={value.find((rule) => rule.month.getTime() === month.getTime())?.weeks.map((week) => week.week) ?? []}
                  onChange={(weeks) => onToggleWeek(month, weeks)}
                />
              </div>
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
    availableSlots: AvailableSlot[];
  };

export function FieldMonthlyPatternBuilder<
  TFieldValues extends FieldValues,
>({
  name,
  disabled,
  startDate,
  endDate,
  ...props
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
      {...props}
    />
  );
}
