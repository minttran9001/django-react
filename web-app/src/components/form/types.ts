import type { ReactNode } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";

export type BaseFieldProps<TFieldValues extends FieldValues> = {
  name: FieldPath<TFieldValues>;
  label?: string;
  description?: string;
  containerClassName?: string;
  disabled?: boolean;
};

export type FieldShellProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  containerClassName?: string;
  children: ReactNode;
};
