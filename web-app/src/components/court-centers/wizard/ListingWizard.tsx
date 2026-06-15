"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AvailabilityStep } from "@/components/court-centers/wizard/AvailabilityStep";
import { BasicStep } from "@/components/court-centers/wizard/BasicStep";
import { CourtsStep } from "@/components/court-centers/wizard/CourtsStep";
import { LocationStep } from "@/components/court-centers/wizard/LocationStep";
import { ReviewStep } from "@/components/court-centers/wizard/ReviewStep";
import { Button } from "@/components/ui/button";
import type { BasicStepValues } from "@/features/court-centers/schemas/basicStepSchema";
import type { CourtsStepValues } from "@/features/court-centers/schemas/courtsStepSchema";
import type { LocationStepValues } from "@/features/court-centers/schemas/locationStepSchema";
import type { SchedulesStepValues } from "@/features/court-centers/schemas/schedulesStepSchema";
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  centerToBasicValues,
  centerToCourtsValues,
  centerToImageState,
  centerToLocationValues,
  centerToSchedulesValues,
  WIZARD_STEPS,
} from "@/features/court-centers/utils/wizard";
import type { CourtCenter, ImageResource } from "@/features/court-centers/types";
import {
  useCreateDraftMutation,
  useGetMyCourtCenterQuery,
  useGetSportsQuery,
  usePublishListingMutation,
  useUpdateDraftMutation,
  useUpdateDraftSchedulesMutation,
  useUploadImagesMutation,
} from "@/lib/api/courtCenterApi";
import { cn } from "@/lib/utils";
import { combineAdjacentSchedules } from "@/features/court-centers/utils/scheduleCalendar";
import { toast } from "sonner";

const FORM_ID = "listing-wizard-form";

type ListingWizardProps =
  | { mode: "create" }
  | { mode: "edit"; listingId: string; initialCenter: CourtCenter };

function parseStep(value: string | null): number {
  const step = Number(value);
  if (Number.isInteger(step) && step >= 1 && step <= 5) {
    return step;
  }
  return 1;
}

export function ListingWizard(props: ListingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isCreateMode = props.mode === "create";
  const listingId = isCreateMode ? null : props.listingId;

  const stepFromUrl = parseStep(searchParams.get("step"));
  const [currentStep, setCurrentStep] = useState(() =>
    isCreateMode ? 1 : stepFromUrl,
  );

  const { data: liveCenter } = useGetMyCourtCenterQuery(listingId ?? "", {
    skip: !listingId,
    refetchOnMountOrArgChange: false,
  });
  const center = liveCenter ?? (isCreateMode ? null : props.initialCenter);
  const isPublished = center?.status === "published";

  useEffect(() => {
    if (isCreateMode || !listingId) {
      return;
    }

    const syncStepFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setCurrentStep(parseStep(params.get("step")));
    };

    window.addEventListener("popstate", syncStepFromUrl);
    return () => window.removeEventListener("popstate", syncStepFromUrl);
  }, [isCreateMode, listingId]);

  const { data: sports = [], isLoading: isLoadingSports } = useGetSportsQuery();
  const [uploadImages, { isLoading: isUploadingImages }] =
    useUploadImagesMutation();
  const [createDraft, { isLoading: isCreatingDraft }] = useCreateDraftMutation();
  const [updateDraft, { isLoading: isUpdatingDraft }] = useUpdateDraftMutation();
  const [updateSchedules, { isLoading: isUpdatingSchedules }] =
    useUpdateDraftSchedulesMutation();
  const [publishListing, { isLoading: isPublishing }] =
    usePublishListingMutation();

  const initialImages = useMemo(
    () => (center ? centerToImageState(center) : null),
    [center],
  );

  const [logoImage, setLogoImage] = useState<ImageResource[]>(
    initialImages?.logoImage ?? [],
  );
  const [centerImages, setCenterImages] = useState<ImageResource[]>(
    initialImages?.centerImages ?? [],
  );
  const [courtImages, setCourtImages] = useState<Record<number, ImageResource[]>>(
    initialImages?.courtImages ?? {},
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSaving =
    isCreatingDraft ||
    isUpdatingDraft ||
    isUpdatingSchedules ||
    isPublishing ||
    isUploadingImages;

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setUploadError(null);
      try {
        const result = await uploadImages(files).unwrap();
        return result.images;
      } catch {
        setUploadError("Failed to upload images. Please try again.");
        return [];
      }
    },
    [uploadImages],
  );

  const goToStep = useCallback(
    (step: number, id = listingId) => {
      if (!id) {
        return;
      }

      setCurrentStep(step);
      window.history.replaceState(
        window.history.state,
        "",
        `/listings/${id}/edit?step=${step}`,
      );
    },
    [listingId],
  );

  const handleBasicSubmit = async (values: BasicStepValues) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      description: values.description,
      logo_id: logoImage[0]?.id,
      image_ids: centerImages.map((image) => image.id),
    };

    try {
      if (isCreateMode) {
        const draft = await createDraft(payload).unwrap();
        router.replace(`/listings/${draft.id}/edit?step=2`);
        toast.success("Draft created successfully");
        return;
      }

      if (!listingId) {
        return;
      }

      await updateDraft({ id: listingId, body: payload }).unwrap();
      toast.success("Listing updated successfully");
      goToStep(2);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  const handleLocationSubmit = async (values: LocationStepValues) => {
    if (!listingId) {
      return;
    }

    setSubmitError(null);
    try {
      await updateDraft({
        id: listingId,
        body: {
          address: values.address,
          latitude: values.latitude,
          longitude: values.longitude,
        },
      }).unwrap();
      goToStep(3);
      toast.success("Listing updated successfully");
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  const handleCourtsSubmit = async (values: CourtsStepValues) => {
    if (!listingId) {
      return;
    }

    setSubmitError(null);
    try {
      await updateDraft({
        id: listingId,
        body: {
          courts: values.courts.map((court, index) => ({
            id: court.id,
            sport_id: court.sport_id,
            title: court.title,
            description: court.description || undefined,
            image_ids: (courtImages[index] ?? []).map((image) => image.id),
            price_per_hour:
              String(court.price_per_hour.amount).trim() !== ""
                ? {
                    amount: Number(court.price_per_hour.amount),
                    currency: court.price_per_hour.currency || "VND",
                  }
                : undefined,
          })),
        },
      }).unwrap();
      goToStep(4);
      toast.success("Listing updated successfully");
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  const handleSchedulesSubmit = async (values: SchedulesStepValues) => {
    if (!listingId) {
      return;
    }

    setSubmitError(null);
    try {
      await updateSchedules({
        id: listingId,
        body: {
          courts: values.courts.map((court) => ({
            id: court.id,
            schedules: combineAdjacentSchedules(court.schedules).map((schedule) => ({
              id: schedule.id,
              day_of_week: schedule.day_of_week,
              start_time: schedule.start_time,
              end_time: schedule.end_time,
            })),
          })),
        },
      }).unwrap();
      goToStep(5);
      toast.success("Listing updated successfully");
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  const handlePublish = async () => {
    if (!listingId) {
      return;
    }

    setSubmitError(null);
    try {
      await publishListing(listingId).unwrap();
      router.push(`/listings/${listingId}`);
      toast.success("Listing published successfully");
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    }
  };

  const handleBack = () => {
    if (currentStep <= 1 || !listingId) {
      return;
    }
    goToStep(currentStep - 1);
  };

  const handleNext = () => {
    if (currentStep === 5) {
      if (isPublished) {
        router.push(`/listings/${listingId}`);
        return;
      }
      void handlePublish();
      return;
    }

    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    form?.requestSubmit();
  };

  const schedulesDefaults = center
    ? centerToSchedulesValues(center)
    : { courts: [] };

  return (
    <div className="space-y-8">
      {!isCreateMode ? (
        <nav className="flex flex-wrap gap-2">
          {WIZARD_STEPS.map((step) => {
            const isActive = step.id === currentStep;
            const isDisabled = !listingId;

            return (
              <button
                key={step.id}
                type="button"
                disabled={isDisabled || isSaving}
                onClick={() => goToStep(step.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                  isDisabled && "cursor-not-allowed opacity-50",
                )}
              >
                {step.id}. {step.label}
              </button>
            );
          })}
        </nav>
      ) : null}

      {currentStep === 1 && (
        <BasicStep
          formId={FORM_ID}
          defaultValues={
            center ? centerToBasicValues(center) : { title: "", description: "" }
          }
          logoImage={logoImage}
          centerImages={centerImages}
          onLogoChange={setLogoImage}
          onCenterImagesChange={setCenterImages}
          onUpload={uploadFiles}
          isUploading={isUploadingImages}
          disabled={isSaving}
          onSubmit={handleBasicSubmit}
        />
      )}

      {currentStep === 2 && center ? (
        <LocationStep
          formId={FORM_ID}
          defaultValues={centerToLocationValues(center)}
          disabled={isSaving}
          onSubmit={handleLocationSubmit}
        />
      ) : null}

      {currentStep === 3 && center ? (
        <CourtsStep
          formId={FORM_ID}
          defaultValues={centerToCourtsValues(center)}
          sports={sports}
          isLoadingSports={isLoadingSports}
          courtImages={courtImages}
          onCourtImagesChange={setCourtImages}
          onUpload={uploadFiles}
          isUploading={isUploadingImages}
          disabled={isSaving}
          onSubmit={handleCourtsSubmit}
        />
      ) : null}

      {currentStep === 4 && center ? (
        <AvailabilityStep
          formId={FORM_ID}
          defaultValues={schedulesDefaults}
          disabled={isSaving}
          onSubmit={handleSchedulesSubmit}
        />
      ) : null}

      {currentStep === 5 && center ? <ReviewStep center={center} /> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          {!isCreateMode && currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={handleBack}
            >
              Back
            </Button>
          ) : null}

          <Button
            type="button"
            disabled={isSaving || (currentStep > 1 && !center)}
            isLoading={isSaving}
            onClick={handleNext}
          >
            {currentStep === 5
              ? isPublished
                ? "Done"
                : isPublishing
                  ? "Publishing..."
                  : "Publish listing"
              : isSaving
                ? "Saving..."
                : "Next"}
          </Button>
        </div>
      </div>

      {uploadError ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}

      {submitError ? (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 p-2 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
