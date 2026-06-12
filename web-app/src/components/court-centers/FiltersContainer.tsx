import { CourtCenterSearchFormValues } from "@/features/auth/schemas/courtCenterSearchSchema";
import FiltersForm from "./FiltersForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

const normalizeSearchQuery = (data: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
        if (!!value) {
            searchParams.set(key, value.toString());
        } else {
            searchParams.delete(key);
        }
    });
    return searchParams.toString();
}

const FiltersContainer = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialValues = useMemo(() => {
        return {
            address: {
                lat: searchParams.get("lat") ? Number(searchParams.get("lat")) : undefined,
                lng: searchParams.get("lng") ? Number(searchParams.get("lng")) : undefined,
                address: searchParams.get("address") ?? "",
            },
            sport_ids: searchParams.get("sport_ids") ? searchParams.get("sport_ids")?.split(",") : undefined,
        }
    }, [searchParams]);
    const onSubmit = (data: CourtCenterSearchFormValues) => {
        const { address, sport_ids } = data;
        const searchQuery = normalizeSearchQuery({
            address: address.address,
            sport_ids: sport_ids?.join(",") ?? undefined,
            lat: address.lat,
            lng: address.lng,
        });

        router.push(`/listings?${searchQuery}`);
    }

    return (
        <div>
            <FiltersForm onSubmit={onSubmit} initialValues={initialValues} />
        </div>
    )
}

export default FiltersContainer;