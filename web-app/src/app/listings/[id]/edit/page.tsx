import { EditCourtCenterView } from "@/components/court-centers/EditCourtCenterView";
import { prefetchCourtCenter } from "@/lib/courtCenter";
import {
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";

export default async function EditListingPage({
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
      <EditCourtCenterView id={id} />
    </RtkQueryHydrator>
  );
}
