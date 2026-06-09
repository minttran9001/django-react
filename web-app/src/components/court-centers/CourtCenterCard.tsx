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

type CourtCenterCardProps = {
  center: CourtCenter;
  className?: string;
};

function getCoverImage(center: CourtCenter): string | null {
  return center.logo?.url ?? center.images[0]?.url ?? null;
}

function getSportNames(center: CourtCenter): string[] {
  const sports = center.courts?.map((court) => court.sport.name) ?? [];
  return [...new Set(sports)];
}

export function CourtCenterCard({ center, className }: CourtCenterCardProps) {
  const coverImage = getCoverImage(center);
  const sportNames = getSportNames(center);
  const courtCount = center.courts?.length ?? 0;

  return (
    <Link prefetch href={`/listings/${center.id}`}>
      <Card
        className={cn(
          "overflow-hidden py-0 transition-shadow hover:shadow-lg",
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
        </div>

        <CardHeader className="gap-2 pb-2">
          <CardTitle className="line-clamp-1 text-lg">{center.title}</CardTitle>
          {center.description ? (
            <CardDescription className="line-clamp-2">
              {center.description}
            </CardDescription>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3 pb-4">
          {center.address ? (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span className="line-clamp-2">{center.address}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
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
