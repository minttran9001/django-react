import { CourtCenterDetailsResolved } from "@/components/court-centers/CourtCenterDetailsResolved";
import { CourtCenterDetailsView } from "@/components/court-centers/CourtCenterDetailsView";
import { prefetchPublicCourtCenter } from "@/lib/courtCenter";
import { formatApiDate } from "@/lib/dates";
import { Suspense, cache } from "react";

const cachedFetchCourtCenter = cache(async (id: string, date: string) => {
  return prefetchPublicCourtCenter({ id, date });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const date = formatApiDate(new Date());
  const courtCenter = await cachedFetchCourtCenter(id, date);

  if (!courtCenter) {
    return {
      title: "Court Center Not Found",
      description: "Court Center Not Found",
      openGraph: {
        title: "Court Center Not Found",
        description: "Court Center Not Found",
      },
    };
  }

  const coverImageUrl =
    courtCenter.logo?.url ?? courtCenter.images[0]?.url ?? undefined;

  return {
    title: courtCenter.title,
    description: courtCenter.description,
    openGraph: {
      title: courtCenter.title,
      description: courtCenter.description,
      ...(coverImageUrl ? { images: [coverImageUrl] } : {}),
    },
    twitter: {
      title: courtCenter.title,
      description: courtCenter.description,
      ...(coverImageUrl ? { images: [coverImageUrl] } : {}),
    },
    alternates: {
      canonical: `/listings/${id}`,
    },
    robots: {
      index: true,
      follow: true,
    },
    ...(coverImageUrl ? { icons: { icon: coverImageUrl } } : {}),
  };
}

export default async function CourtCenterDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const date = formatApiDate(new Date());

  // Deliberately not awaited: the server streams the resolved content into the
  // HTML for crawlers, while the router can commit the navigation immediately
  // and show the fallback, which renders from the search summary in the store.
  const courtCenter = await cachedFetchCourtCenter(id, date);

  return (
    <Suspense fallback={<CourtCenterDetailsView id={id} />}>
      <CourtCenterDetailsResolved id={id} courtCenter={courtCenter} />
    </Suspense>
  );
}
