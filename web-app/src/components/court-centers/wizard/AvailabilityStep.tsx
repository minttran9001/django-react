"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { WeeklyAvailabilityCalendar } from "@/components/court-centers/wizard/WeeklyAvailabilityCalendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  schedulesStepSchema,
  type SchedulesStepValues,
} from "@/features/court-centers/schemas/schedulesStepSchema";

type AvailabilityStepProps = {
  defaultValues: SchedulesStepValues;
  disabled?: boolean;
  onSubmit: (values: SchedulesStepValues) => Promise<void>;
  formId: string;
};

export function AvailabilityStep({
  defaultValues,
  disabled,
  onSubmit,
  formId,
}: AvailabilityStepProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SchedulesStepValues>({
    resolver: zodResolver(schedulesStepSchema),
    defaultValues,
  });

  const { fields } = useFieldArray({
    control,
    name: "courts",
  });

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {fields.map((courtField, courtIndex) => (
        <CourtAvailabilityCalendar
          key={courtField.id}
          courtIndex={courtIndex}
          courtTitle={courtField.title}
          control={control}
          register={register}
          disabled={disabled}
          errors={errors.courts?.[courtIndex]}
        />
      ))}

      {typeof errors.courts?.message === "string" && (
        <p className="text-sm text-destructive">{errors.courts.message}</p>
      )}
    </form>
  );
}

type CourtAvailabilityCalendarProps = {
  courtIndex: number;
  courtTitle: string;
  control: ReturnType<typeof useForm<SchedulesStepValues>>["control"];
  register: ReturnType<typeof useForm<SchedulesStepValues>>["register"];
  disabled?: boolean;
  errors?: {
    schedules?: Array<{
      day_of_week?: { message?: string };
      start_time?: { message?: string };
      end_time?: { message?: string };
    }>;
    message?: string;
  };
};

function CourtAvailabilityCalendar({
  courtIndex,
  courtTitle,
  control,
  register,
  disabled,
  errors,
}: CourtAvailabilityCalendarProps) {
  const schedules =
    useWatch({
      control,
      name: `courts.${courtIndex}.schedules`,
    }) ?? [];

  const { replace } = useFieldArray({
    control,
    name: `courts.${courtIndex}.schedules`,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{courtTitle}</CardTitle>
        <CardDescription>
          Set weekly availability on the calendar below.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="hidden"
          {...register(`courts.${courtIndex}.id`, { valueAsNumber: true })}
        />
        <input type="hidden" {...register(`courts.${courtIndex}.title`)} />

        <WeeklyAvailabilityCalendar
          schedules={schedules}
          onChange={replace}
          disabled={disabled}
          idPrefix={`court-${courtIndex}`}
        />

        {typeof errors?.schedules?.message === "string" && (
          <p className="text-sm text-destructive">{errors.schedules.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
