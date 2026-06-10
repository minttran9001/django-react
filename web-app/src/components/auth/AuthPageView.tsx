"use client";

import Link from "next/link";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { SocialButton } from "@/components/auth/SocialButton";
import { Logo } from "@/components/landing/Logo";
import { Card } from "@/components/ui/card";

type AuthPageViewProps = {
  isLogin?: boolean;
};

export function AuthPageView({ isLogin = false }: AuthPageViewProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>

      <Card className="w-full max-w-md p-8 shadow-sm">
        <SocialButton className="mb-2" disabled />

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1 border-t border-border" />
          <p className="my-3 text-center">OR</p>
          <div className="flex-1 border-t border-border" />
        </div>

        {isLogin ? (
          <>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">Login</h1>
            <p className="mb-6 text-sm text-muted-foreground">Welcome back!</p>
            <LoginForm />
          </>
        ) : (
          <>
            <h1 className="mb-2 text-3xl font-semibold tracking-tight">Sign up</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Create an account to list and book courts.
            </p>
            <RegisterForm />
          </>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="font-medium text-foreground hover:underline"
          >
            {isLogin ? "Sign up" : "Log in"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
