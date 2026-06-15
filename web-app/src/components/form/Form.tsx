"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
  type UseFormReturn,
} from "react-hook-form";
import type { ZodType } from "zod";

import { cn } from "@/lib/utils";

// ZodType<Output, Input> — both constrained to TFieldValues so:
//   1. zodResolver's Zod v4 overload sees Input extends FieldValues ✓
//   2. TypeScript infers TFieldValues from the schema prop — no explicit generic needed
type FormSchema<TFieldValues extends FieldValues> = ZodType<
  TFieldValues,
  TFieldValues
>;

type FormProps<TFieldValues extends FieldValues> = {
  schema: FormSchema<TFieldValues>;
  defaultValues?: DefaultValues<TFieldValues>;
  onSubmit: SubmitHandler<TFieldValues>;
  children:
    | React.ReactNode
    | ((form: UseFormReturn<TFieldValues>) => React.ReactNode);
  className?: string;
} & Omit<React.ComponentProps<"form">, "onSubmit" | "children" | "className">;

export function Form<TFieldValues extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  ...formProps
}: FormProps<TFieldValues>) {
  const form = useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className={cn(className)}
        {...formProps}
      >
        {typeof children === "function" ? children(form) : children}
      </form>
    </FormProvider>
  );
}
