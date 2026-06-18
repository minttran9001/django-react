"use client";
/* eslint-disable react-hooks/refs */

import { useRef } from "react";
import { Provider } from "react-redux";

import type { CurrentUser } from "@/lib/auth/types";
import { applyQueryHydrations } from "@/lib/rtk-query/hydration";
import { makeStore, type AppStore } from "@/lib/store";

import { InitialUserContext } from "./InitialUserContext";
import type { Sport } from "@/features/court-centers/types";
import type { CourtCenter } from "@/features/court-centers/types";
import type { RtkQueryApiId } from "@/lib/rtk-query/registry";

type Entity = 'sports' | 'courtCenters' | 'courtCenter' | 'myCourtCenters' | 'myCourtCenter';
type Endpoint = 'getSports' | 'getCourtCenters' | 'getCourtCenter' | 'getMyCourtCenters' | 'getMyCourtCenter';
type Data = Sport[] | CourtCenter[] | CourtCenter | CourtCenter[] | CourtCenter;

export function StoreProvider({
  initialUser,
  necessaryData,
  children,
}: {
  initialUser: CurrentUser | null;
  necessaryData?: { entity: Entity; endpoint: Endpoint; data: Data, apiId: RtkQueryApiId }[] | null;
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

    if (necessaryData && necessaryData?.length > 0) {
      necessaryData.forEach(({ apiId, endpoint, data }) => {
        applyQueryHydrations(storeRef.current.dispatch, [
          {
            apiId,
            endpointName: endpoint,
            arg: undefined,
            data: data,
          },
        ]);
      });
    }
  }

  return (
    <InitialUserContext.Provider value={initialUser}>
      <Provider store={storeRef.current}>{children}</Provider>
    </InitialUserContext.Provider>
  );
}
