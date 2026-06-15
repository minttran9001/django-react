"use client";

import { useRouter } from "next/navigation";
import { DefaultValues } from "react-hook-form";

import { FieldTextInput, Form } from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  registerSchema,
  type RegisterFormValues,
} from "@/features/auth/schemas/registerSchema";
import { useRegisterMutation } from "@/lib/api/authApi";

function getRegisterErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "data" in error &&
    error.data &&
    typeof error.data === "object"
  ) {
    const data = error.data as Record<string, string[] | string>;
    if (Array.isArray(data.email)) return data.email[0];
    if (typeof data.email === "string") return data.email;
    if (Array.isArray(data.password)) return data.password[0];
    if (typeof data.password === "string") return data.password;
  }

  return "Something went wrong. Please try again.";
}

export function RegisterForm() {
  const router = useRouter();
  const [registerUser, { isLoading, error: registerError }] =
    useRegisterMutation();

  const defaultValues: DefaultValues<RegisterFormValues> = {
    email: "",
    password: "",
    confirmPassword: "",
  };

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await registerUser({
        email: values.email,
        password: values.password,
      }).unwrap();

      router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
    } catch {
      // Error state is handled via registerError below.
    }
  };

  return (
    <Form schema={registerSchema} defaultValues={defaultValues} onSubmit={onSubmit} className="space-y-5">
      <FieldTextInput<RegisterFormValues>
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="Email"
      />

      <FieldTextInput<RegisterFormValues>
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="********"
      />

      <FieldTextInput<RegisterFormValues>
        name="confirmPassword"
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        placeholder="********"
      />

      <Button type="submit" className="w-full" disabled={isLoading} isLoading={isLoading}>
        {isLoading ? "Creating account..." : "Sign up"}
      </Button>

      {registerError ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {getRegisterErrorMessage(registerError)}
        </p>
      ) : null}
    </Form>
  );
}
