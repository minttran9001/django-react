"use client";

import { createContext, useContext } from "react";

import type { CurrentUser } from "@/lib/auth/types";

export const InitialUserContext = createContext<CurrentUser | null>(null);

export function useInitialUser() {
  return useContext(InitialUserContext);
}
