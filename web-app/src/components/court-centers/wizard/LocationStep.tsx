"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { AutocompleteLocationInput } from "@/components/location/AutocompleteLocationInput";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  locationStepSchema,
  type LocationStepValues,
} from "@/features/court-centers/schemas/locationStepSchema";
import { LocationMap } from "@/components/location/LocationMap";

type LocationStepProps = {
  defaultValues: LocationStepValues;
  disabled?: boolean;
  onSubmit: (values: LocationStepValues) => Promise<void>;
  formId: string;
};

export function LocationStep({
  defaultValues,
  disabled,
  onSubmit,
  formId,
}: LocationStepProps) {
  const {
    setValue,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LocationStepValues>({
    resolver: zodResolver(locationStepSchema),
    defaultValues,
  });

  const values = watch();
  const latitude = values["latitude"];
  const longitude = values["longitude"];
  const address = values["address"];

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Help players find your court center on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AutocompleteLocationInput
            defaultValue={defaultValues.address ?? ""}
            disabled={disabled}
            onLocationSelect={(location) => {
              setValue("latitude", location.latitude, { shouldValidate: true });
              setValue("longitude", location.longitude, {
                shouldValidate: true,
              });
              setValue("address", location.address, { shouldValidate: true });
            }}
          />
          {errors.address && (
            <p className="mt-2 text-sm text-destructive">
              {errors.address.message}
            </p>
          )}
          <div className="mt-4">
            {latitude && longitude && <LocationMap
              latitude={latitude ?? null}
              longitude={longitude ?? null}
              label={address ?? undefined}
            />}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
