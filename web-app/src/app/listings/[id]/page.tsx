import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import { prefetchPublicCourtCenter } from "@/lib/courtCenter";
import { formatApiDate } from "@/lib/dates";
import {
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";
import { cache } from "react";


const cachedFetchCourtCenter = cache(
  async (id: string, date: string) => {
    return prefetchPublicCourtCenter({ id, date });
  }
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = formatApiDate(new Date());
  const courtCenter = await cachedFetchCourtCenter(id, date);

  return {
    title: courtCenter.title,
    description: courtCenter.description,
    openGraph: {
      title: courtCenter.title,
      description: courtCenter.description,
      images: [courtCenter.image],
    },
    twitter: {
      title: courtCenter.title,
      description: courtCenter.description,
      images: [courtCenter.image],
    },
    alternates: {
      canonical: `/listings/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    icons: {
      icon: courtCenter.image,
    },
  };
}


export default async function CourtCenterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const date = formatApiDate(new Date());
  const courtCenter = await cachedFetchCourtCenter(id, date);
  const queryArg = { id, date };


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
