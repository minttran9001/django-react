"use client";

import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Pencil,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

import { CourtCenterDetailsSkeleton } from "@/components/court-centers/CourtCenterDetailsSkeleton";
import { LocationMap } from "@/components/location/LocationMap";
import { Button } from "@/components/ui/button";
import { ImageGallerySlider } from "@/components/ui/ImageGallerySlider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  CourtCenter,
  CourtSummary,
  ImageResource,
} from "@/features/court-centers/types";
import { useGetCourtCenterQuery } from "@/lib/api/courtCenterApi";
import { formatApiDate } from "@/lib/dates";
import { hasMapCoordinates } from "@/lib/mapbox/static-map";
import { useGetMeQuery } from "@/lib/api/authApi";
import BookingPanel from "../booking/BookingPanel";

type CourtCenterDetailsViewProps = {
  id: string;
};

function getGalleryImages(center: CourtCenter): ImageResource[] {
  const gallery = [...center.images];

  if (center.logo && !gallery.some((image) => image.id === center.logo?.id)) {
    return [center.logo, ...gallery];
  }

  if (gallery.length > 0) {
    return gallery;
  }

  return center.logo ? [center.logo] : [];
}

function getSportNames(center: CourtCenter): string[] {
  const sports = center.courts?.map((court) => court.sport.name) ?? [];
  return [...new Set(sports)];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getMapsUrl(center: CourtCenter) {
  if (center.latitude && center.longitude) {
    return `https://www.google.com/maps/search/?api=1&query=${center.latitude},${center.longitude}`;
  }

  if (center.address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.address)}`;
  }

  return null;
}

function CourtCard({ court }: { court: CourtSummary }) {
  const coverImage = court.images[0]?.url ?? null;

  return (
    <Card className="overflow-hidden py-0">
      <div className="relative aspect-[16/10] bg-muted">
        {coverImage ? (
          <Image
            src={coverImage}
            alt={court.title}
            fill
            sizes="(max-width: 640px) 100vw, 384px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No photo
          </div>
        )}
      </div>

      <CardHeader className="gap-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg">{court.title}</CardTitle>
          <span className="shrink-0 rounded-full border px-2.5 py-1 text-xs text-muted-foreground">
            {court.sport.name}
          </span>
        </div>
        {court.description ? (
          <CardDescription className="line-clamp-3">
            {court.description}
          </CardDescription>
        ) : null}
      </CardHeader>

      <CardContent className="pb-4 text-xs text-muted-foreground">
        {court.images.length > 0
          ? `${court.images.length} ${court.images.length === 1 ? "photo" : "photos"}`
          : "No photos uploaded"}
      </CardContent>
    </Card>
  );
}

export function CourtCenterDetailsView({ id }: CourtCenterDetailsViewProps) {
  const { data: courtCenter, isLoading, isError } = useGetCourtCenterQuery({
    id,
    date: formatApiDate(new Date()),
  });

  const { data: user } = useGetMeQuery();
  const isOwnListing = user?.id === courtCenter?.owner.id;
  const galleryImages = useMemo(
    () => (courtCenter ? getGalleryImages(courtCenter) : []),
    [courtCenter],
  );
  const sportNames = useMemo(
    () => (courtCenter ? getSportNames(courtCenter) : []),
    [courtCenter],
  );
  const mapsUrl = courtCenter ? getMapsUrl(courtCenter) : null;
  const courtCount = courtCenter?.courts?.length ?? 0;

  if (isLoading) {
    return <CourtCenterDetailsSkeleton />;
  }

  if (isError || !courtCenter) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-8 text-center">
        <p className="text-lg font-medium text-destructive">
          Unable to load this listing
        </p>
        <p className="mt-2 text-sm text-destructive/80">
          It may not exist or you may not have access.
        </p>
        <Button className="mt-6" variant="outline" asChild>
          <Link href="/listings">
            <ArrowLeft className="size-4" />
            Back to listings
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isOwnListing && courtCenter.status === "draft" ? (
        <div className="flex w-full items-center justify-between p-4 shadow-md">
          <p className="text-sm text-muted-foreground">
            This listing is a draft. Continue editing to publish it.
          </p>
          <Button
            variant="ghost"
            className="w-fit px-0 hover:bg-transparent"
            asChild
          >
            <Link prefetch href={`/listings/${id}/edit?step=1`}>
              <Pencil className="size-4" />
              Continue editing
            </Link>
          </Button>
        </div>
      ) : null}
      {isOwnListing && courtCenter.status === "published" ? (
        <div className="flex w-full items-center justify-between p-4 shadow-md">
          <p className="text-sm text-muted-foreground">
            This listing is published. You can edit it to make changes.
          </p>
          <Button
            variant="ghost"
            className="w-fit px-0 hover:bg-transparent"
            asChild
          >
            <Link prefetch href={`/listings/${id}/edit?step=1`}>
              <Pencil className="size-4" />
              Edit
            </Link>
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="ghost"
          className="w-fit px-0 hover:bg-transparent"
          asChild
        >
          <Link href={isOwnListing ? "/listings/mine" : "/listings"}>
            <ArrowLeft className="size-4" />
            {isOwnListing ? "Back to my listings" : "Back to listings"}
          </Link>
        </Button>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="size-4" />
          <span>Listed {formatDate(courtCenter.created_at)}</span>
        </div>
      </div>

      <ImageGallerySlider images={galleryImages} alt={courtCenter.title} />

      <div className="flex flex-row gap-4">
        <div className="basis-3/5 space-y-4">
          <section className="space-y-4">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {courtCenter.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                <Trophy className="size-3.5" />
                {courtCount} {courtCount === 1 ? "court" : "courts"}
              </span>
              {sportNames.map((sport) => (
                <span
                  key={sport}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground"
                >
                  {sport}
                </span>
              ))}
            </div>
          </section>

          {courtCenter.description ? (
            <Card>
              <CardHeader>
                <CardTitle>About this venue</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {courtCenter.description}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {hasMapCoordinates(courtCenter.latitude, courtCenter.longitude) ? (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle>Location</CardTitle>
                {courtCenter.address ? (
                  <CardDescription>{courtCenter.address}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-3">
                <LocationMap
                  latitude={courtCenter.latitude}
                  longitude={courtCenter.longitude}
                  label={courtCenter.title}
                />
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Open in Google Maps
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">Courts</h2>
              <p className="text-sm text-muted-foreground">
                Courts available for booking at this venue.
              </p>
            </div>

            {courtCount > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {courtCenter.courts?.map((court) => (
                  <CourtCard key={court.id} court={court} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border bg-card p-8 text-center ring-1 ring-foreground/10">
                <p className="font-medium">No courts added yet</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Edit this listing to add courts for players to book.
                </p>
              </div>
            )}
          </section>
        </div>
        <BookingPanel
          courtCenterId={id}
          courtCenterStatus={courtCenter.status}
          isOwnListing={isOwnListing}
          className="basis-2/5"
          courts={courtCenter.courts ?? []}
        />
      </div>
    </div>
  );
}
