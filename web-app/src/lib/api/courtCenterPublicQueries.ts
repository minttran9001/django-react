"use client";

import type { CourtCenter, SlotsByCourt } from "@/features/court-centers/types";
import {
  type CourtCenterQueryArgs,
  type CourtCenterTimeslotsQueryArgs,
  useGetCourtCenterQuery,
  useGetCourtCenterTimeslotsQuery,
  useGetCourtCentersQuery,
} from "@/lib/api/courtCenterApi";
import { useAppSelector } from "@/lib/hooks";
import { marketplaceCourtCenterSelectors } from "@/lib/slices/marketplaceData/slice";
import { useMemo } from "react";

const EMPTY_SLOTS_BY_COURT: SlotsByCourt = {};

export function usePublicCourtCenterQuery(
  args: CourtCenterQueryArgs,
  options?: { skip?: boolean; refetchOnMountOrArgChange?: boolean | number },
) {
  const query = useGetCourtCenterQuery(args, options);
  // Select by the requested id, not by `query.data`, so a center already
  // ingested by the search list renders before this request resolves.
  const center = useAppSelector((state) =>
    marketplaceCourtCenterSelectors.selectById(state, Number(args.id)),
  );
  return { ...query, data: center, isLoading: query.isLoading && !center };
}

export function usePublicCourtTimeslotsQuery(
  args: CourtCenterTimeslotsQueryArgs,
  options?: { skip?: boolean; refetchOnMountOrArgChange?: boolean | number },
) {
  const { data, ...rest } = useGetCourtCenterTimeslotsQuery(args, options);
  return { ...rest, data: data ?? EMPTY_SLOTS_BY_COURT };
}

export function usePublicCourtCentersQuery(
  args: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    q?: string;
    sportIds?: string[];
    date?: string;
    timezone?: string;
  },
  options?: { skip?: boolean },
) {
  const { data, ...rest } = useGetCourtCentersQuery(args, {
    skip: options?.skip,
  });

  const entities = useAppSelector(
    marketplaceCourtCenterSelectors.selectEntities,
  );
  const centers = useMemo(
    () =>
      (data ?? [])
        .map((id) => entities[id])
        .filter((center): center is CourtCenter => center != null),
    [data, entities],
  );
  return { ...rest, data: centers };
}
