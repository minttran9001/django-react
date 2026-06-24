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

type FormProps<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
> = {
  schema: ZodType<TOutput, TInput>;
  defaultValues?: DefaultValues<TInput>;
  onSubmit: SubmitHandler<TOutput>;
  children:
    | React.ReactNode
    | ((form: UseFormReturn<TInput, unknown, TOutput>) => React.ReactNode);
  className?: string;
} & Omit<React.ComponentProps<"form">, "onSubmit" | "children" | "className">;

export function Form<
  TInput extends FieldValues,
  TOutput extends FieldValues = TInput,
>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  ...formProps
}: FormProps<TInput, TOutput>) {
  const form = useForm<TInput, unknown, TOutput>({
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
