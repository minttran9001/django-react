"use client";

import { CourtCenterCard } from "@/components/court-centers/CourtCenterCard";
import { CourtCenterCardSkeleton } from "@/components/court-centers/CourtCenterCardSkeleton";
import { useGetCourtCentersQuery } from "@/lib/api/courtCenterApi";
import FiltersContainer from "./FiltersContainer";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { env } from "@/lib/env";

export function CourtCenterListView() {
  const searchParams = useSearchParams();
  const filters = useMemo(() => {
    return {
      address: {
        lat: searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined,
        lng: searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined,
      },
      sport_ids: searchParams.get("sport_ids") ? searchParams.get("sport_ids")?.split(",") : undefined,
    };
  }, [searchParams]);
  const { data: courtCenters = [], isLoading, isError, isFetching } = useGetCourtCentersQuery({
    ...(filters.address && {
      lat: filters.address.lat,
      lng: filters.address.lng,
      radius_km: env.NEXT_PUBLIC_DEFAULT_RADIUS_KM,
    }),
    ...(filters.sport_ids && {
      sport_ids: filters.sport_ids,
    }),
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Court centers</h1>
        <p className="text-muted-foreground">
          Browse venues and find a court to book.
        </p>
      </div>

      <FiltersContainer />

      {(isLoading || isFetching) ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <CourtCenterCardSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {isError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          Unable to load court centers. Please try again later.
        </div>
      ) : null}

      {!isLoading && !isError && courtCenters.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center ring-1 ring-foreground/10">
          <p className="text-lg font-medium">No court centers yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Be the first to create a listing and add your courts.
          </p>
        </div>
      ) : null}

      {!isLoading && !isError && courtCenters.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courtCenters.map((center) => (
            <CourtCenterCard key={center.id} center={center} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
