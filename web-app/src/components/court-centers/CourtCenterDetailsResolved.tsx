"use client";

import { useMemo } from "react";

import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import type { CourtCenter } from "@/features/court-centers/types";
import { useAppStore } from "@/lib/hooks";
import {
  applyQueryHydrations,
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { marketplaceCourtCenterSelectors } from "@/lib/slices/marketplaceData/slice";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";

type CourtCenterDetailsResolvedProps = {
  id: string;
  courtCenter: CourtCenter | null;
};

// This component is used to resolve the court center data from the server.
// It is used to seed the store with the court center data and then render the
// court center details view.
export function CourtCenterDetailsResolved({
  id,
  courtCenter,
}: CourtCenterDetailsResolvedProps) {
  const store = useAppStore();

  const entries = useMemo(
    () =>
      collectQueryHydrations(
        createQueryHydrationEntry(
          "courtCenterApi",
          "getCourtCenter",
          { id },
          courtCenter,
        ),
      ),
    [id, courtCenter],
  );

  // Seed during render only when nothing is renderable yet, so the server
  // emits real HTML instead of a skeleton. On a client navigation the search
  // summary is already in the store and RtkQueryHydrator's effect suffices —
  // dispatching here would update the mounted fallback mid-render.
  if (!marketplaceCourtCenterSelectors.selectById(store.getState(), Number(id))) {
    applyQueryHydrations(store.dispatch, entries);
  }

  return (
    <RtkQueryHydrator entries={entries}>
      <CourtCenterDetailsView id={id} />
    </RtkQueryHydrator>
  );
}
