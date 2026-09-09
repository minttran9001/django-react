import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import type { CourtCenter } from "@/features/court-centers/types";
import { prefetchPublicCourtCenter } from "@/lib/courtCenter";
import { formatApiDate } from "@/lib/dates";
import {
  collectQueryHydrations,
  createQueryHydrationEntry,
} from "@/lib/rtk-query/hydration";
import { RtkQueryHydrator } from "@/providers/RtkQueryHydrator";
import { notFound } from "next/navigation";
import { cache } from "react";

const cachedFetchCourtCenter = cache(
  async (id: string, date: string) => {
    return prefetchPublicCourtCenter({ id, date });
  },
);

function listingCoverImage(courtCenter: CourtCenter): string | undefined {
  return courtCenter.logo?.url ?? courtCenter.images[0]?.url;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const date = formatApiDate(new Date());
  const courtCenter = await cachedFetchCourtCenter(id, date);

  if (!courtCenter) {
    notFound();
  }

  const image = listingCoverImage(courtCenter);

  return {
    title: courtCenter.title,
    description: courtCenter.description,
    openGraph: {
      title: courtCenter.title,
      description: courtCenter.description,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      title: courtCenter.title,
      description: courtCenter.description,
      ...(image ? { images: [image] } : {}),
    },
    alternates: {
      canonical: `/listings/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(image ? { icons: { icon: image } } : {}),
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

  if (!courtCenter) {
    notFound();
  }

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
