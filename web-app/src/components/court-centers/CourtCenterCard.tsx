import { MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourtCenter } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import ThreeDotMenu from "../ui/ThreeDotMenu";
import { useMemo } from "react";
import useDistanceFromCourtCenter from "@/hooks/useDistanceFromCourtCenter";
type CourtCenterCardProps = {
  center: CourtCenter;
  className?: string;
  variant?: "public" | "owner";
};

function getCoverImage(center: CourtCenter): string | null {
  return center.logo?.url ?? center.images[0]?.url ?? null;
}

function getSportNames(center: CourtCenter): string[] {
  const sports = center.courts?.map((court) => court.sport.name) ?? [];
  return [...new Set(sports)];
}

function getHref(center: CourtCenter, variant: "public" | "owner"): string {
  if (variant === "owner" && center.status === "draft") {
    return `/listings/${center.id}/edit?step=1`;
  }

  return `/listings/${center.id}`;
}

export function CourtCenterCard({
  center,
  className,
  variant = "public",
}: CourtCenterCardProps) {
  const coverImage = getCoverImage(center);
  const sportNames = getSportNames(center);
  const courtCount = center.courts?.length ?? 0;
  const href = getHref(center, variant);

  const items = useMemo(() => {
    if (variant === "owner") {
      return [
        { id: "edit", label: <Link href={`/listings/${center.id}/edit?step=1`}>Edit</Link> },
        { id: "delete", label: <Link href={`/listings/${center.id}/delete`}>Delete</Link> },
      ];
    }
    return [];
  }, [variant, center.id]);

  const { distanceString } = useDistanceFromCourtCenter(center);

  return (
    <Link prefetch={true} href={href} className="block h-full">
      <Card
        className={cn(
          "h-full overflow-hidden py-0 transition-shadow hover:shadow-lg",
          className,
        )}
      >
        <div className="relative aspect-[16/10] w-full bg-muted">
          {coverImage ? (
            <Image
              src={coverImage}
              alt={center.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo yet
            </div>
          )}

          {variant === "owner" ? (
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium",
                center.status === "draft"
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 text-white",
              )}
            >
              {center.status === "draft" ? "Draft" : "Published"}
            </span>
          ) : null}

          {variant === "owner" ? (
            <ThreeDotMenu items={items} triggerClassName="absolute right-3 top-3 z-10" />
          ) : null}
        </div>

        <CardHeader className="gap-2 pb-2">
          <CardTitle className="line-clamp-1 text-lg">{center.title}</CardTitle>
          <CardDescription className="line-clamp-2 min-h-10">
            {center.description || "\u00A0"}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col gap-3 pb-4">
          <div className="flex min-h-10 items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-4 shrink-0" />
            <span className="line-clamp-2">{center.address || "\u00A0"}</span>

          </div>
          {distanceString ? (
            <span className="w-fit rounded-full bg-muted-foreground/10 text-green-600 px-2.5 py-1 text-xs font-medium">
              {distanceString}
            </span>
          ) : null}

          <div className="mt-auto flex min-h-7 flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
              {courtCount} {courtCount === 1 ? "court" : "courts"}
            </span>
            {sportNames.map((sport) => (
              <span
                key={sport}
                className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground"
              >
                {sport}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
