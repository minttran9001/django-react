"use client";

import { FieldLocationInput, Form } from "@/components/form";
import { LocationMap } from "@/components/location/LocationMap";
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

  return (
    <Form schema={locationStepSchema} defaultValues={defaultValues} onSubmit={onSubmit} id={formId} className="space-y-8">
      {(form) => {
        const latitude = form.watch("latitude");
        const longitude = form.watch("longitude");
        const address = form.watch("address");

        return <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>
              Help players find your court center on the map.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldLocationInput
              name="address"
              latitudeName="latitude"
              longitudeName="longitude"
              defaultValue={defaultValues.address ?? ""}
              disabled={disabled}
            />

            <div className="mt-4">
              {latitude && longitude ? (
                <LocationMap
                  latitude={latitude ?? null}
                  longitude={longitude ?? null}
                  label={address ?? undefined}
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      }}

    </Form>
  );
}
