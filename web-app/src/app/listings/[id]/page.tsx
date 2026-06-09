import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import { prefetchCourtCenter } from "@/lib/courtCenter";
import {
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";

export default async function CourtCenterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courtCenter = await prefetchCourtCenter(id);

  return (
    <RtkQueryHydrator
      entries={collectQueryHydrations(
        createQueryHydrationEntry(
          "courtCenterApi",
          "getMyCourtCenter",
          id,
          courtCenter,
        ),
      )}
    >
      <CourtCenterDetailsView id={id} />
    </RtkQueryHydrator>
  );
}
