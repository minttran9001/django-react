"use client";

import { ListingWizard } from "@/components/court-centers/wizard/ListingWizard";

export function CreateCourtCenterView() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Create a listing
        </h1>
        <p className="text-muted-foreground">
          Start with the basics. You can save progress as you complete each step.
        </p>
      </div>
      <ListingWizard mode="create" />
    </div>
  );
}
