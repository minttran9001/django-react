"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CourtCenterForm } from "@/components/court-centers/CourtCenterForm";
import { Button } from "@/components/ui/button";
import { useGetMyCourtCenterQuery } from "@/lib/api/courtCenterApi";

type EditCourtCenterViewProps = {
  id: string;
};

export function EditCourtCenterView({ id }: EditCourtCenterViewProps) {
  const { data: courtCenter, isLoading, isError } = useGetMyCourtCenterQuery(id);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading listing...</p>;
  }

  if (isError || !courtCenter) {
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
          render={<Link href={`/listings/${id}`} />}
        >
          <ArrowLeft className="size-4" />
          Back to listing
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-muted-foreground">
          Update your court center details, photos, and courts.
        </p>
      </div>

      <CourtCenterForm mode="edit" listingId={id} initialCenter={courtCenter} />
    </div>
  );
}
