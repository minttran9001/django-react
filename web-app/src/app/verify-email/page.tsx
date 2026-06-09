import { Suspense } from "react";

import { VerifyEmailView } from "@/components/auth/VerifyEmailView";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <VerifyEmailView />
    </Suspense>
  );
}
