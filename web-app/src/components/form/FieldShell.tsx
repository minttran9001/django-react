import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import type { FieldShellProps } from "./types";

export function getFieldErrorId(id?: string, error?: string) {
  return error && id ? `${id}-error` : undefined;
}

export function FieldShell({
  id,
  label,
  description,
  error,
  containerClassName,
  children,
}: FieldShellProps) {
  const errorId = getFieldErrorId(id, error);

  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
