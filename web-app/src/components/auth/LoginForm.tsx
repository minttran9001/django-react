"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FieldTextInput, Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/loginSchema";
import {
  useLoginMutation,
  useResendVerificationEmailMutation,
} from "@/lib/api/authApi";

export function LoginForm() {
  const router = useRouter();
  const [login, { isLoading, isError, error: loginError, reset: resetLogin }] =
    useLoginMutation();
  const [
    resendVerificationEmail,
    { isLoading: isResendingVerificationEmail, reset: resetResendVerificationEmail },
  ] = useResendVerificationEmailMutation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    return () => {
      resetLogin();
      resetResendVerificationEmail();
    };
  }, [resetLogin, resetResendVerificationEmail]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values).unwrap();
      router.push("/");
    } catch {
      // Error state is handled via isError below.
    }
  };

  const isNotVerifiedError = (error: unknown): boolean => {
    if (
      error &&
      typeof error === "object" &&
      "data" in error &&
      error.data &&
      typeof error.data === "object"
    ) {
      const data = error.data as { code?: string };
      return data.code === "email_not_verified";
    }
    return false;
  };

  const onResendVerificationEmail = async () => {
    try {
      const email = form.getValues("email");
      await resendVerificationEmail({ email }).unwrap();
      router.push(`/verify-email?email=${email}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="space-y-5">
      <FieldTextInput<LoginFormValues>
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email"
      />

      <FieldTextInput<LoginFormValues>
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="********"
      />

      <p className="text-sm text-destructive">
        {isNotVerifiedError(loginError)
          ? "Email not verified. Please check your inbox for a verification link."
          : ""}
      </p>

      {isNotVerifiedError(loginError) ? (
        <Button
          onClick={onResendVerificationEmail}
          isLoading={isResendingVerificationEmail}
        >
          Resend Verification Email
        </Button>
      ) : (
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          isLoading={isLoading}
        >
          {isLoading ? "Signing in..." : "Login"}
        </Button>
      )}

      {isError && !isNotVerifiedError(loginError) ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          Invalid email or password. Please try again.
        </p>
      ) : null}
    </Form>
  );
}
