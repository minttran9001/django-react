"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ListingWizard } from "@/components/court-centers/wizard/ListingWizard";
import { Button } from "@/components/ui/button";
import type { CourtCenter } from "@/features/court-centers/types";
import { useGetMyCourtCenterQuery } from "@/lib/api/courtCenterApi";

type EditCourtCenterViewProps = {
  id: string;
  initialCenter: CourtCenter;
};

export function EditCourtCenterView({ id, initialCenter }: EditCourtCenterViewProps) {
  const router = useRouter();
  const { data: courtCenter, isLoading, isError } = useGetMyCourtCenterQuery(id);
  const center = courtCenter ?? initialCenter;

  useEffect(() => {
    if (center.status === "published") {
      router.replace(`/listings/${id}`);
    }
  }, [center.status, id, router]);

  if (isLoading && !courtCenter) {
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

  if (center.status === "published") {
    return <p className="text-muted-foreground">Redirecting...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-fit px-0 hover:bg-transparent"
          render={<Link href="/listings/mine" />}
        >
          <ArrowLeft className="size-4" />
          Back to my listings
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">
          Continue your listing
        </h1>
        <p className="text-muted-foreground">
          Complete each step and publish when you are ready.
        </p>
      </div>

      <ListingWizard mode="edit" listingId={id} initialCenter={center} />
    </div>
  );
}
