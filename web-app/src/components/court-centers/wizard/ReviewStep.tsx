"use client";

import { MapPin, Trophy } from "lucide-react";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CourtCenter, CourtSchedule } from "@/features/court-centers/types";
import { DAY_OPTIONS, normalizeTime } from "@/features/court-centers/utils/wizard";

type ReviewStepProps = {
  center: CourtCenter;
};

function getDayLabel(dayOfWeek: number): string {
  return DAY_OPTIONS.find((day) => day.value === dayOfWeek)?.label ?? "Unknown";
}

const groupAvailabilityByDay = (schedules: CourtSchedule[]) => schedules.reduce<Record<number, CourtSchedule[]>>((acc, schedule) => {
  if (!acc[schedule.day_of_week]) {
    acc[schedule.day_of_week] = [];
  }
  acc[schedule.day_of_week].push(schedule);
  return acc;
}, {});

export function ReviewStep({ center }: ReviewStepProps) {
  const coverImage = center.logo?.url ?? center.images[0]?.url ?? null;
  const sportNames = [
    ...new Set(center.courts?.map((court) => court.sport.name) ?? []),
  ];


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review your listing</CardTitle>
          <CardDescription>
            Confirm everything looks correct before publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            {coverImage ? (
              <div className="relative aspect-[16/10] w-full max-w-xs overflow-hidden rounded-xl bg-muted">
                <Image
                  src={coverImage}
                  alt={center.title}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Center name</p>
                <p className="text-lg font-medium">{center.title}</p>
              </div>
              {center.description ? (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{center.description}</p>
                </div>
              ) : null}
              {center.address ? (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>{center.address}</span>
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {center.courts?.length ?? 0} courts
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
            </div>
          </div>
        </CardContent>
      </Card>

      {center.courts?.map((court) => (
        <Card key={court.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="size-4" />
              {court.title}
            </CardTitle>
            <CardDescription>{court.sport.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {court.description ? (
              <p className="text-sm text-muted-foreground">{court.description}</p>
            ) : null}

            {(court.schedules?.length ?? 0) > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Weekly availability</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {Object.entries(groupAvailabilityByDay(court.schedules ?? [])).map(([day, schedules]) => (
                    <li key={day} className="flex items-center gap-2">
                      <span className="text-muted-foreground min-w-20">{getDayLabel(Number(day))}</span>
                      <span>-</span>
                      <div className="flex flex-col gap-1">
                        {schedules.map((schedule) => (
                          <span key={schedule.id}>{normalizeTime(schedule.start_time)} – {normalizeTime(schedule.end_time)}</span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-destructive">
                No availability set for this court.
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
