"use client";

import type { CourtCenter } from "@/features/court-centers/types";
import {
  type CourtCenterQueryArgs,
  useGetCourtCenterQuery,
  useGetCourtCentersQuery,
} from "@/lib/api/courtCenterApi";
import { useAppSelector } from "@/lib/hooks";
import { marketplaceCourtCenterSelectors } from "@/lib/slices/marketplaceData/slice";

export function usePublicCourtCenterQuery(
  args: CourtCenterQueryArgs,
  options?: { skip?: boolean; refetchOnMountOrArgChange?: boolean | number },
) {
  const query = useGetCourtCenterQuery(args, options);
  const center = useAppSelector((state) =>
    query.data
      ? marketplaceCourtCenterSelectors.selectById(state, query.data.id)
      : undefined,
  );
  return { ...query, data: center };
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
  const query = useGetCourtCentersQuery(args, options);
  const centers = useAppSelector((state) => {
    const ids = query.data ?? [];
    return ids
      .map((id) => marketplaceCourtCenterSelectors.selectById(state, id))
      .filter((center): center is CourtCenter => center != null);
  });
  return { ...query, data: centers };
}
