"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { ListingWizard } from "@/components/court-centers/wizard/ListingWizard";
import { Button } from "@/components/ui/button";
import type { CourtCenter } from "@/features/court-centers/types";
import { useGetMyCourtCenterQuery } from "@/lib/api/courtCenterApi";

type EditCourtCenterViewProps = {
  id: string;
  initialCenter: CourtCenter;
};

export function EditCourtCenterView({ id, initialCenter }: EditCourtCenterViewProps) {
  const { data: courtCenter, isLoading, isError } = useGetMyCourtCenterQuery(id, {
    refetchOnMountOrArgChange: false,
  });
  const center = courtCenter ?? initialCenter;
  const isPublished = center.status === "published";

  if (isLoading && !courtCenter && !initialCenter) {
    return <p className="text-muted-foreground">Loading listing...</p>;
  }

  if (isError || !center) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
        <p className="text-lg font-medium text-destructive">
          Unable to load this listing
        </p>
        <Button
          className="mt-6"
          variant="outline"
          render={<Link href="/listings/mine" />}
        >
          <ArrowLeft className="size-4" />
          Back to my listings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-fit px-0 hover:bg-transparent"
          render={<Link href={isPublished ? `/listings/${id}` : "/listings/mine"} />}
        >
          <ArrowLeft className="size-4" />
          {isPublished ? "Back to listing" : "Back to my listings"}
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isPublished ? "Edit listing" : "Continue your listing"}
        </h1>
        <p className="text-muted-foreground">
          {isPublished
            ? "Update your listing details and save your changes."
            : "Complete each step and publish when you are ready."}
        </p>
      </div>

      <ListingWizard mode="edit" listingId={id} initialCenter={center} />
    </div>
  );
}
