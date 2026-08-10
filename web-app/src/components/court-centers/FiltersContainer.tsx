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
            sportIds: searchParams.get("sportIds") ? searchParams.get("sportIds")?.split(",") : undefined,
            radiusKm: searchParams.get("radiusKm") ? Number(searchParams.get("radiusKm")) : undefined,
        }
    }, [searchParams]);
    const onSubmit = (data: CourtCenterSearchFormValues) => {
        try {
            const { address, sportIds, date, radiusKm } = data;
            const searchQuery = normalizeSearchQuery({
                address: address.address,
                sportIds: sportIds?.join(",") ?? undefined,
                lat: address.lat,
                lng: address.lng,
                date: date ? formatApiDate(date) : undefined,
                radiusKm,
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
