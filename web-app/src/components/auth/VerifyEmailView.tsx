"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { FcOk } from "react-icons/fc";

import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";
import { Card } from "@/components/ui/card";
import { useVerifyEmail } from "@/hooks/useVerifyEmail";

export function VerifyEmailView() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const hasAutoVerified = useRef(false);

  const { onVerifyEmail, inProgress, error, success } = useVerifyEmail();

  useEffect(() => {
    if (!token || !email || hasAutoVerified.current) {
      return;
    }

    hasAutoVerified.current = true;
    onVerifyEmail({ token, email });
  }, [token, email, onVerifyEmail]);

  return (
    <div className="flex min-h-screen w-screen items-start justify-center px-4 pt-36">
      <Card className="mx-auto w-full max-w-[500px] p-8">
        {success ? (
          <>
            <div className="mb-2 flex items-center gap-2">
              <FcOk size={30} />
              <h1 className="text-2xl">Email Verified</h1>
            </div>
            <Link href="/login" className="text-sm text-blue-500 hover:underline">
              Click here to login with your new email
            </Link>
          </>
        ) : (
          <>
            <h1 className="mb-4 text-4xl">Verify Email</h1>
            {email && !token && (
              <p className="mb-4 text-sm text-muted-foreground">
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">{email}</span>.
                Check your inbox or enter the token below.
              </p>
            )}
            <VerifyEmailForm
              defaultValues={{
                email: email ?? undefined,
                token: token ?? undefined,
              }}
              inProgress={inProgress}
              error={error}
              onSubmit={onVerifyEmail}
            />
          </>
        )}
      </Card>
    </div>
  );
}
