"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  verifyEmailSchema,
  type VerifyEmailFormValues,
} from "@/features/auth/schemas/verifyEmailSchema";
import Link from "next/link";

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
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: defaultValues?.email ?? "",
      token: defaultValues?.token ?? "",
    },
  });

  const email = watch("email");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="Email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="token">Token</Label>
        <Input
          id="token"
          type="text"
          placeholder="Token"
          aria-invalid={Boolean(errors.token)}
          {...register("token")}
        />
        {errors.token && (
          <p className="text-sm text-destructive">{errors.token.message}</p>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={inProgress} isLoading={inProgress}>
          {inProgress ? "Verifying..." : "Verify Email"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => onResendVerificationEmail(email)} isLoading={isResendingVerificationEmail} disabled={inProgress || isResendingVerificationEmail}>
          Resend Verification Email
        </Button>
      </div>

      <Link
        href="/login"
        className="text-sm hover:underline"
      >
        Back to login
      </Link>

      {error && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
