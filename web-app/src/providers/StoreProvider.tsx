"use client";
/* eslint-disable react-hooks/refs */

import { useRef } from "react";
import { Provider } from "react-redux";

import type { CurrentUser } from "@/lib/auth/types";
import { applyQueryHydrations } from "@/lib/rtk-query/hydration";
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

    applyQueryHydrations(storeRef.current.dispatch, [
      {
        apiId: "authApi",
        endpointName: "getMe",
        arg: undefined,
        data: initialUser,
      },
    ]);
  }

  return (
    <InitialUserContext.Provider value={initialUser}>
      <Provider store={storeRef.current}>{children}</Provider>
    </InitialUserContext.Provider>
  );
}
