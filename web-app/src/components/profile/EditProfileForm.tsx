"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  FieldDatePicker,
  FieldPendingImageInput,
  FieldTextInput,
  Form,
} from "@/components/form";
import { Button } from "@/components/ui/button";
import {
  editProfileSchema,
  type EditProfileFormValues,
} from "@/features/auth/schemas/editProfileSchema";
import type { ImageResource } from "@/features/court-centers/types";
import { cn } from "@/lib/utils";

type EditProfileFormProps = {
  initialValues: EditProfileFormValues;
  onSubmit: (values: EditProfileFormValues) => Promise<void>;
  onUpload: (files: File[]) => Promise<ImageResource[]>;
  isUploadingImages: boolean;
  className?: string;
  inProgress: boolean;
  submitError: string | null;
};

const EditProfileForm = ({
  initialValues,
  onSubmit,
  className,
  onUpload,
  isUploadingImages,
  inProgress,
  submitError,
}: EditProfileFormProps) => {
  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: initialValues,
  });

  return (
    <div className={cn("", className)}>
      <Form
        form={form}
        onSubmit={onSubmit}
        className="flex w-full flex-col items-end gap-4 space-y-3"
      >
        <div className="flex w-full gap-4">
          <div className="flex-1 space-y-4 rounded-lg bg-white p-4 shadow-md">
            <FieldPendingImageInput<EditProfileFormValues>
              name="avatar"
              label="Edit Avatar"
              onUpload={onUpload}
              isUploading={isUploadingImages}
              disabled={isUploadingImages}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase">Contact</h3>

              <FieldTextInput<EditProfileFormValues>
                name="email"
                label="Email"
                className="bg-white"
                description="We will be sending your booking confirmation to this email."
              />

              <FieldTextInput<EditProfileFormValues>
                name="phone_number"
                label="Phone Number"
                placeholder="Enter your mobile number"
                className="bg-white"
                description="Enter your mobile number for booking updates. This will stay private and not be visible on your profile."
              />
            </div>
          </div>

          <div className="flex-1 space-y-4 rounded-lg bg-white p-4 shadow-md">
            <h3 className="text-sm font-medium uppercase">
              Personal Information
            </h3>

            <FieldTextInput<EditProfileFormValues>
              name="name"
              label="Name"
              placeholder="Enter your name"
              className="bg-white"
            />

            <FieldDatePicker<EditProfileFormValues>
              name="date_of_birth"
              label="Date of Birth"
              placeholder="Enter your date of birth"
              className="bg-white"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="mt-4"
          disabled={inProgress}
          isLoading={inProgress}
        >
          Update Profile
        </Button>
      </Form>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}
    </div>
  );
};

export default EditProfileForm;
