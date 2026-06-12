"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";

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
  const form = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: defaultValues?.email ?? "",
      token: defaultValues?.token ?? "",
    },
  });

  const email = form.watch("email");

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-3">
      <FieldTextInput<VerifyEmailFormValues>
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email"
      />

      <FieldTextInput<VerifyEmailFormValues>
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
          onClick={() => onResendVerificationEmail(email)}
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
      ) : null}
    </Form>
  );
}
