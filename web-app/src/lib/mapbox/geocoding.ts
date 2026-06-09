import { env } from "@/lib/env";

export interface MapboxLocationSuggestion {
  id: string;
  placeName: string;
  latitude: string;
  longitude: string;
}

interface MapboxGeocodingResponse {
  features: Array<{
    id: string;
    place_name: string;
    center: [number, number];
  }>;
}

export function isMapboxConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_MAPBOX_TOKEN);
}

export async function searchMapboxLocations(
  query: string,
  signal?: AbortSignal,
): Promise<MapboxLocationSuggestion[]> {
  const token = env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const trimmedQuery = query.trim();

  if (!token || trimmedQuery.length < 2) {
    return [];
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmedQuery)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("limit", "6");
  url.searchParams.set("types", "address,place,poi,locality,neighborhood");

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error("Failed to search locations.");
  }

  const data = (await response.json()) as MapboxGeocodingResponse;

  return data.features.map((feature) => ({
    id: feature.id,
    placeName: feature.place_name,
    longitude: feature.center[0].toFixed(6),
    latitude: feature.center[1].toFixed(6),
  }));
}
