"use client";

import { MapPin } from "lucide-react";

import {
  buildMapboxStaticMapUrl,
  hasMapCoordinates,
  parseCoordinate,
} from "@/lib/mapbox/static-map";
import { cn } from "@/lib/utils";

type LocationMapProps = {
  latitude: string | null;
  longitude: string | null;
  label?: string;
  className?: string;
};

export function LocationMap({
  latitude,
  longitude,
  label = "Venue location",
  className,
}: LocationMapProps) {
  const lat = parseCoordinate(latitude);
  const lng = parseCoordinate(longitude);

  if (!hasMapCoordinates(latitude, longitude) || lat == null || lng == null) {
    return (
      <div
        className={cn(
          "flex aspect-[16/7] items-center justify-center rounded-xl bg-muted px-4 text-center text-sm text-muted-foreground",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-2">
          <MapPin className="size-5" />
          <p>Location map unavailable without coordinates.</p>
        </div>
      </div>
    );
  }

  const mapUrl = buildMapboxStaticMapUrl(lng, lat);

  if (!mapUrl) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative aspect-[16/7] overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapUrl}
        alt={`Map showing ${label}`}
        className="h-full w-full object-cover"
        loading="lazy"
      />
    </div>
  );
}
