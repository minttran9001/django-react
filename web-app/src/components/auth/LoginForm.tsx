"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
import { hasApiErrorCode, getApiErrorMessage } from "@/lib/api/errors";
import { DefaultValues } from "react-hook-form";

export function LoginForm() {
  const router = useRouter();
  const [login, { isLoading, isError, error: loginError, reset: resetLogin }] =
    useLoginMutation();
  const [
    resendVerificationEmail,
    { isLoading: isResendingVerificationEmail, reset: resetResendVerificationEmail },
  ] = useResendVerificationEmailMutation();

  const defaultValues: DefaultValues<LoginFormValues> = {
    email: "",
    password: "",
  };


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

  const isNotVerifiedError = hasApiErrorCode(loginError, "email_not_verified");

  const onResendVerificationEmail = (email: string) => async () => {
    try {
      await resendVerificationEmail({ email }).unwrap();
      router.push(`/verify-email?email=${email}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Form schema={loginSchema} defaultValues={defaultValues} onSubmit={onSubmit} className="space-y-5">
      {(form) => (
        <>
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
            {isNotVerifiedError
              ? "Email not verified. Please check your inbox for a verification link."
              : ""}
          </p>

          {isNotVerifiedError ? (
            <Button
              onClick={onResendVerificationEmail(form.getValues("email"))}
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

          {isError && !isNotVerifiedError ? (
            <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
              {getApiErrorMessage(
                loginError,
                "Invalid email or password. Please try again.",
              )}
            </p>
          ) : null}
        </>
      )}
    </Form>
  );
}
