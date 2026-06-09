"use client";

import Link from "next/link";

import { Card } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { SocialButton } from "@/components/auth/SocialButton";

type AuthPageViewProps = {
  isLogin?: boolean;
};

export function AuthPageView({ isLogin = false }: AuthPageViewProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg p-8">
        <SocialButton className="mb-2" disabled />

        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="flex-1 border-t border-gray-300" />
          <p className="my-3 text-center">OR</p>
          <div className="flex-1 border-t border-gray-300" />
        </div>

        {isLogin ? (
          <>
            <h1 className="mb-2 text-4xl">Login</h1>
            <p className="mb-3 text-sm">Welcome back!</p>
            <LoginForm />
          </>
        ) : (
          <>
            <h1 className="mb-4 text-4xl">Sign up</h1>
            <RegisterForm />
          </>
        )}

        <p className="mt-3 text-center text-sm">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link
            href={isLogin ? "/register" : "/login"}
            className="text-primary hover:underline"
          >
            {isLogin ? "Sign up" : "Login"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
