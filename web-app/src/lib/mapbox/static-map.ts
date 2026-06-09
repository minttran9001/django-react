import { env } from "@/lib/env";

import { isMapboxConfigured } from "./geocoding";

export function parseCoordinate(value: string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type StaticMapOptions = {
  width?: number;
  height?: number;
  zoom?: number;
  retina?: boolean;
};

export function buildMapboxStaticMapUrl(
  longitude: number,
  latitude: number,
  {
    width = 800,
    height = 360,
    zoom = 14,
    retina = true,
  }: StaticMapOptions = {},
) {
  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return null;
  }

  const pin = `pin-l+2563eb(${longitude},${latitude})`;
  const center = `${longitude},${latitude},${zoom},0,0`;
  const size = `${width}x${height}${retina ? "@2x" : ""}`;

  const url = new URL(
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pin}/${center}/${size}`,
  );
  url.searchParams.set("access_token", token);

  return url.toString();
}

export function hasMapCoordinates(
  latitude: string | null | undefined,
  longitude: string | null | undefined,
) {
  return (
    isMapboxConfigured() &&
    parseCoordinate(latitude) != null &&
    parseCoordinate(longitude) != null
  );
}
