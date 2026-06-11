"use client";
import { editProfileSchema, EditProfileFormValues } from "@/features/auth/schemas/editProfileSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { cn } from "@/lib/utils";
import { PendingImageInput } from "../ui/PendingImageInput";
import { ImageResource } from "@/features/court-centers/types";
import { Button } from "../ui/button";

type EditProfileFormProps = {
    initialValues: EditProfileFormValues
    onSubmit: (values: EditProfileFormValues) => Promise<void>
    onUpload: (files: File[]) => Promise<ImageResource[]>
    isUploadingImages: boolean
    className?: string
};

const EditProfileForm = ({ initialValues, onSubmit, className, onUpload, isUploadingImages }: EditProfileFormProps) => {
    const { register, handleSubmit, formState: { errors }, setValue, control } = useForm<EditProfileFormValues>({
        resolver: zodResolver(editProfileSchema),
        defaultValues: initialValues,
    });

    const onChange = (images: ImageResource[]) => {
        setValue("avatar", images[0] ?? undefined, { shouldDirty: true, shouldValidate: true });
    };

    const avatar = useWatch({ control, name: "avatar" });

    return (
        <div className={cn("", className)}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 flex flex-col gap-4 items-end w-full">
                <div className="flex gap-4 w-full">
                    <div className="space-y-4 rounded-lg p-4 bg-white shadow-md flex-1">
                        <div>
                            <PendingImageInput label={"Edit Avatar"} value={avatar ? [avatar as ImageResource] : []} onChange={onChange} onUpload={onUpload} isUploading={isUploadingImages} disabled={isUploadingImages} />
                        </div>
                        <div className="space-y-4">
                            <h3 className="uppercase text-sm font-medium">
                                Contact
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" {...register("email")} className="bg-white" />
                                <p className="text-sm text-muted-foreground">
                                    We will be sending your booking confirmation to this email.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone_number">Phone Number</Label>
                                <Input id="phone_number" {...register("phone_number")} placeholder="Enter your mobile number" className="bg-white" />
                                <p className="text-sm text-muted-foreground">
                                    Enter your mobile number for booking updates. This will stay private and not be visible on your profile.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 rounded-lg p-4 bg-white shadow-md flex-1">
                        <h3 className="uppercase text-sm font-medium">
                            Personal Information
                        </h3>
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" {...register("name")} placeholder="Enter your name" className="bg-white" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date_of_birth">Date of Birth</Label>
                            <Input id="date_of_birth" type="date" {...register("date_of_birth")} placeholder="Enter your date of birth" className="bg-white" />
                        </div>
                    </div>
                </div>
                <Button type="submit" className="mt-4">Update Profile</Button>
            </form>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
    );
};

export default EditProfileForm;