/* eslint-disable react-hooks/refs */
"use client";

import { useRef } from "react";
import { Provider } from "react-redux";

import { authApi } from "@/lib/api/authApi";
import type { CurrentUser } from "@/lib/auth/types";
import { makeStore, type AppStore } from "@/lib/store";

import { InitialUserContext } from "./InitialUserContext";

export function StoreProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null;
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    storeRef.current.dispatch(
      authApi.util.upsertQueryData("getMe", undefined, { user: initialUser }),
    );
  }

  return (
    <InitialUserContext.Provider value={initialUser}>
      <Provider store={storeRef.current}>{children}</Provider>
    </InitialUserContext.Provider>
  );
}
