"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import { CourtCenterCard } from "@/components/court-centers/CourtCenterCard";
import { CourtCenterCardSkeleton } from "@/components/court-centers/CourtCenterCardSkeleton";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import { useGetMyCourtCentersQuery } from "@/lib/api/courtCenterApi";

export function MyCourtCenterListView() {
  const {
    data: courtCenters = [],
    isLoading,
    isError,
  } = useGetMyCourtCentersQuery();

  return (
    <div className="min-h-screen bg-muted/30">
      <LandingHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16 pt-36">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              My listings
            </h1>
            <p className="text-muted-foreground">
              Manage the court centers you have created.
            </p>
          </div>
          <Button render={<Link href="/listings/create" />}>
            <Plus className="size-4" />
            Create listing
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <CourtCenterCardSkeleton key={index} />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            Unable to load your listings. Please try again later.
          </div>
        ) : null}

        {!isLoading && !isError && courtCenters.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center ring-1 ring-foreground/10">
            <p className="text-lg font-medium">You have no listings yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first court center and add courts for players to book.
            </p>
            <Button className="mt-6" render={<Link href="/listings/create" />}>
              <Plus className="size-4" />
              Create listing
            </Button>
          </div>
        ) : null}

        {!isLoading && !isError && courtCenters.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {courtCenters.map((center) => (
              <CourtCenterCard key={center.id} center={center} />
            ))}
          </div>
        ) : null}
      </main>
    </div>
  );
}
