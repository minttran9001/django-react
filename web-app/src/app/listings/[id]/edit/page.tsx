import { Suspense } from "react";

import { EditCourtCenterView } from "@/components/court-centers/EditCourtCenterView";
import { prefetchCourtCenter } from "@/lib/courtCenter";
import {
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";
import { redirect } from "next/navigation";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const courtCenter = await prefetchCourtCenter(id);

  if (!courtCenter) {
    redirect("/listings/mine");
  }

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
      <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
        <EditCourtCenterView id={id} initialCenter={courtCenter} />
      </Suspense>
    </RtkQueryHydrator>
  );
}
