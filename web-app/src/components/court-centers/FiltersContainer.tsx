import { CourtCenterSearchFormValues } from "@/features/auth/schemas/courtCenterSearchSchema";
import FiltersForm from "./FiltersForm";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { formatApiDate } from "@/lib/dates";

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
            radius_km: searchParams.get("radius_km") ? Number(searchParams.get("radius_km")) : undefined,
        }
    }, [searchParams]);
    const onSubmit = (data: CourtCenterSearchFormValues) => {
        try {
            const { address, sport_ids, date, radius_km } = data;
            const searchQuery = normalizeSearchQuery({
                address: address.address,
                sport_ids: sport_ids?.join(",") ?? undefined,
                lat: address.lat,
                lng: address.lng,
                date: date ? formatApiDate(date) : undefined,
                radius_km,
            });

            router.push(`/listings?${searchQuery}`);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div>
            <FiltersForm onSubmit={onSubmit} initialValues={initialValues} />
        </div>
    )
}

export default FiltersContainer;