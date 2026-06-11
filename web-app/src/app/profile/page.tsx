"use client";
import EditProfileForm from "@/components/profile/EditProfileForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EditProfileFormValues } from "@/features/auth/schemas/editProfileSchema";
import {
    useEditProfileMutation,
    useGetMeQuery,
    useLogoutMutation,
} from "@/lib/api/authApi";
import { useUploadImagesMutation } from "@/lib/api/courtCenterApi";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

const ProfilePage = () => {
    const router = useRouter();
    const { data: me } = useGetMeQuery();
    const initialValues = useMemo(() => ({
        name: me?.name ?? "",
        email: me?.email ?? "",
        phone_number: me?.phone_number ?? "",
        address: me?.address ?? "",
        date_of_birth: me?.date_of_birth ?? "",
        avatar: me?.avatar ?? undefined,
    }), [me]);

    const [uploadImages, { isLoading: isUploadingImages }] = useUploadImagesMutation();
    const [editProfile, { isLoading: isEditingProfile, error: submitError }] = useEditProfileMutation();
    const [logout] = useLogoutMutation();
    const onUpload = async (files: File[]) => {
        const result = await uploadImages(files).unwrap();
        return result.images;
    };

    const onSubmit = async (values: EditProfileFormValues) => {
        try {
            const result = await editProfile({
                name: values.name,
                email: values.email,
                phone_number: values.phone_number,
                address: values.address,
                date_of_birth: values.date_of_birth,
                avatar_id: values.avatar?.id ?? null,
            }).unwrap();

            toast.success(result.message);

            if (result.email_verification_required) {
                await logout().unwrap();
                router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
            }
        } catch (error) {
            console.error(error);
        }
    };
    return (
        <div className="relative overflow-hidden">
            <div className="flex items-center gap-4 justify-center shadow-lg rounded-lg p-4 mb-20">
                <div className="absolute left-[50%] top-[-135px] z-0 h-[285px] w-[640px] translate-x-[-50%] rounded-[50%] bg-gradient-to-b from-[#4A19C3] to-[#557EEA] sm:top-[-128px] sm:h-[285px] sm:w-[1067px]" />
                <div className="flex items-center flex-col gap-4 mt-20">
                    <Avatar className="size-40">
                        <AvatarImage src={me?.avatar?.url ?? ""} />
                        <AvatarFallback>
                            {me?.name?.charAt(0) || <User />}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2 items-center">
                        <h1 className="text-2xl font-bold">{me?.name ?? "No Name"}</h1>
                    </div>
                </div>
            </div>


            <EditProfileForm initialValues={initialValues} onSubmit={onSubmit} onUpload={onUpload} isUploadingImages={isUploadingImages} inProgress={isEditingProfile} submitError={submitError} />
        </div >
    );
};

export default ProfilePage;