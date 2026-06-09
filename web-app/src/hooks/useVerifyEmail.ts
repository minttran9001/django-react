"use client";

import { useCallback, useState } from "react";

import type { VerifyEmailFormValues } from "@/features/auth/schemas/verifyEmailSchema";

export function useVerifyEmail() {
  const [inProgress, setInProgress] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);

  const onVerifyEmail = useCallback(async (values: VerifyEmailFormValues) => {
    setInProgress(true);
    setError(undefined);

    // UI-only mock — wire to POST /api/verify-email when the backend is ready
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (values.token === "invalid") {
      setError("Invalid token");
      setInProgress(false);
      return;
    }

    setSuccess(true);
    setInProgress(false);
  }, []);

  return {
    onVerifyEmail,
    inProgress,
    error,
    success,
  };
}
