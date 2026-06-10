"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginSchema,
  type LoginFormValues,
} from "@/features/auth/schemas/loginSchema";
import { useLoginMutation, useResendVerificationEmailMutation } from "@/lib/api/authApi";
import { useEffect } from "react";

export function LoginForm() {
  const router = useRouter();
  const [login, { isLoading, isError, error: loginError, reset: resetLogin }] = useLoginMutation();
  const [resendVerificationEmail, { isLoading: isResendingVerificationEmail, reset: resetResendVerificationEmail }] = useResendVerificationEmailMutation();
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
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
    } catch (error) {
      // Error state is handled via isError below.
    }
  };

  const isNotVerifiedError = (error: unknown): boolean => {
    if (error && typeof error === "object" && "data" in error && error.data && typeof error.data === "object") {
      return error.data.code === "email_not_verified";
    }
    return false;
  };

  const onResendVerificationEmail = async () => {
    try {
      const email = getValues("email");
      await resendVerificationEmail({ email }).unwrap();
      router.push(`/verify-email?email=${email}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="********"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <p className="text-sm text-destructive">
        {isNotVerifiedError(loginError) ? "Email not verified. Please check your inbox for a verification link." : ""}
      </p>
      {
        isNotVerifiedError(loginError) ? (
          <Button onClick={onResendVerificationEmail} isLoading={isResendingVerificationEmail}>Resend Verification Email</Button>
        ) : (
          <Button type="submit" className="w-full" disabled={isLoading} isLoading={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        )
      }

      {isError && !isNotVerifiedError(loginError) && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          Invalid email or password. Please try again.
        </p>
      )}
    </form>
  );
}
