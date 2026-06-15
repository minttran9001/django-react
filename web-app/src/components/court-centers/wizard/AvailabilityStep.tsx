"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { FieldErrors, UseFormReturn } from "react-hook-form";

import { WeeklyAvailabilityCalendar } from "@/components/court-centers/wizard/WeeklyAvailabilityCalendar";
import { FieldHiddenInput, Form } from "@/components/form";
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

const AvailabilityStepContent = ({ form, disabled }: { form: UseFormReturn<SchedulesStepValues>, disabled?: boolean }) => {
  const { control } = form;


  const { errors } = form.formState;

  const { fields } = useFieldArray({
    control,
    name: "courts",
  });
  return <>
    {fields.map((courtField, courtIndex) => (
      <CourtAvailabilityCalendar
        key={courtField.id}
        courtIndex={courtIndex}
        courtTitle={courtField.title}
        control={control}
        disabled={disabled}
        errors={errors.courts?.[courtIndex]}
      />
    ))}

    {typeof errors.courts?.message === "string" ? (
      <p className="text-sm text-destructive">{errors.courts.message}</p>
    ) : null}
  </>
}

export function AvailabilityStep({
  defaultValues,
  disabled,
  onSubmit,
  formId,
}: AvailabilityStepProps) {

  return (
    <Form schema={schedulesStepSchema} defaultValues={defaultValues} onSubmit={onSubmit} id={formId} className="space-y-8">
      {(form) => (
        <AvailabilityStepContent form={form} disabled={disabled} />
      )}
    </Form>
  );
}

type CourtAvailabilityCalendarProps = {
  courtIndex: number;
  courtTitle: string;
  control: ReturnType<typeof useForm<SchedulesStepValues>>["control"];
  disabled?: boolean;
  errors?: FieldErrors<SchedulesStepValues["courts"][number]>;
};

function CourtAvailabilityCalendar({
  courtIndex,
  courtTitle,
  control,
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
        <FieldHiddenInput<SchedulesStepValues>
          name={`courts.${courtIndex}.id`}
          valueAsNumber
        />
        <FieldHiddenInput<SchedulesStepValues>
          name={`courts.${courtIndex}.title`}
        />

        <WeeklyAvailabilityCalendar
          schedules={schedules}
          onChange={replace}
          disabled={disabled}
          idPrefix={`court-${courtIndex}`}
        />

        {errors?.schedules &&
          typeof errors.schedules === "object" &&
          "message" in errors.schedules &&
          typeof errors.schedules.message === "string" ? (
          <p className="text-sm text-destructive">{errors.schedules.message}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
