import type { CourtCenter } from "@/features/court-centers/types";
import { useUserGeoCoordinates } from "@/providers/UserGeoCoordinatesContext";

const calculateDistance = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (latitude2 - latitude1) * (Math.PI / 180);
  const dLon = (longitude2 - longitude1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(latitude1 * (Math.PI / 180)) *
      Math.cos(latitude2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(d);
};

const useDistanceFromCourtCenter = (courtCenter?: CourtCenter) => {
  const { latitude: browserLatitude, longitude: browserLongitude } =
    useUserGeoCoordinates();
  const { latitude, longitude } = courtCenter ?? {};
  if (!latitude || !longitude || !browserLatitude || !browserLongitude) {
    return { distanceString: null, distance: null };
  }
  const distance = calculateDistance(
    browserLatitude,
    browserLongitude,
    Number(latitude),
    Number(longitude),
  );
  return { distance, distanceString: `${distance} km` };
};

export default useDistanceFromCourtCenter;
