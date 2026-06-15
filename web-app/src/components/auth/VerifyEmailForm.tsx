"use client";

import Link from "next/link";

import { FieldTextInput, Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from "@/features/auth/schemas/verifyEmailSchema";

type VerifyEmailFormProps = {
  defaultValues?: Partial<VerifyEmailFormValues>;
  inProgress?: boolean;
  error?: string;
  onSubmit: (values: VerifyEmailFormValues) => void;
  onResendVerificationEmail: (email: string) => void;
  isResendingVerificationEmail: boolean;
};

export function VerifyEmailForm({
  defaultValues,
  inProgress,
  error,
  onSubmit,
  onResendVerificationEmail,
  isResendingVerificationEmail,
}: VerifyEmailFormProps) {
  return (
    <Form schema={verifyEmailSchema} defaultValues={defaultValues} onSubmit={onSubmit} className="space-y-3">
      {(form) => (
        <>
          <FieldTextInput
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="Email"
          />

          <FieldTextInput
            name="token"
            label="Token"
            type="text"
            placeholder="Token"
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={inProgress}
              isLoading={inProgress}
            >
              {inProgress ? "Verifying..." : "Verify Email"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onResendVerificationEmail(form.getValues("email"))}
              isLoading={isResendingVerificationEmail}
              disabled={inProgress || isResendingVerificationEmail}
            >
              Resend Verification Email
            </Button>
          </div>

          <Link href="/login" className="text-sm hover:underline">
            Back to login
          </Link>

          {error ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}</>
      )}
    </Form>
  );
}
