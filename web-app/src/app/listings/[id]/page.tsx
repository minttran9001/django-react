import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import { prefetchPublicCourtCenter } from "@/lib/courtCenter";
import { formatApiDate } from "@/lib/dates";
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
  const courtCenter = await prefetchPublicCourtCenter(id);
  const queryArg = { id, date: formatApiDate(new Date()) };

  return (
    <RtkQueryHydrator
      entries={collectQueryHydrations(
        createQueryHydrationEntry(
          "courtCenterApi",
          "getCourtCenter",
          queryArg,
          courtCenter,
        ),
      )}
    >
      <CourtCenterDetailsView id={id} />
    </RtkQueryHydrator>
  );
}
