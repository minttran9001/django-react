"use client";

import { useForm } from "react-hook-form";
import { CourtCenterSearchFormValues, courtCenterSearchSchema } from "@/features/auth/schemas/courtCenterSearchSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AutocompleteLocationInput } from "../location/AutocompleteLocationInput";
import { SelectCore } from "../ui/select";
import { useGetSportsQuery } from "@/lib/api/courtCenterApi";
import { Button } from "../ui/button";
import MultiSelect from "../ui/multi-select";

type FiltersFormProps = {
    onSubmit: (data: CourtCenterSearchFormValues) => void;
    initialValues?: CourtCenterSearchFormValues;
}

const FiltersForm = ({ onSubmit, initialValues }: FiltersFormProps) => {
    const { handleSubmit, setValue, watch, formState: { isSubmitting }, reset } = useForm<CourtCenterSearchFormValues>({
        resolver: zodResolver(courtCenterSearchSchema),
        defaultValues: initialValues,
    });
    const { data: sports = [] } = useGetSportsQuery();
    const sportIds = watch("sport_ids", []);
    const sportOptions = sports.map((sport) => ({ label: sport.name, value: sport.id.toString() }));
    const address = watch("address", {});

    const onClearFilters = () => {
        const resetValues = {
            address: {
                lat: undefined,
                lng: undefined,
                address: "",
                query: "",
            },
            sport_ids: [],
        };
        reset(resetValues);
        onSubmit({
            ...resetValues,
        });
    };

    return (
        <form className="bg-white mt-4 shadow-lg p-10 rounded-4xl flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <h4 className="text-2xl font-bold">Filter your search</h4>
            <div className="flex flex-row gap-2">
                <div className="flex flex-col gap-2 w-full">
                    <AutocompleteLocationInput
                        id="address"
                        placeholder="Search for a location"
                        label=""
                        query={address.query ?? ""}
                        setQuery={(query) => setValue("address", { ...address, query })}
                        location={{
                            address: address.address ?? "",
                            latitude: address.lat?.toString() ?? "",
                            longitude: address.lng?.toString() ?? "",
                        }}
                        onLocationSelect={(location) => setValue("address", { lat: location?.latitude ? Number(location.latitude) : undefined, lng: location?.longitude ? Number(location.longitude) : undefined, address: location?.address ?? "" })}
                    />
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <MultiSelect
                        placeholder="Select a sport"
                        items={sportOptions}
                        value={sportIds ?? []}
                        onChange={(value) => setValue("sport_ids", value)}
                    />
                </div>
            </div>
            <div className="flex flex-row gap-2 self-end">
                <Button type="button" variant="outline" className="" disabled={isSubmitting} isLoading={isSubmitting} onClick={onClearFilters}>
                    Clear Filters
                </Button>
                <Button type="submit" className="" disabled={isSubmitting} isLoading={isSubmitting}>
                    Filter
                </Button>
            </div>
        </form>
    )
}

export default FiltersForm;