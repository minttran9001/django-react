"use client";

import { useForm } from "react-hook-form";
import { CourtCenterSearchFormValues, courtCenterSearchSchema } from "@/features/auth/schemas/courtCenterSearchSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { AutocompleteLocationInput } from "../location/AutocompleteLocationInput";
import { SelectCore } from "../ui/select";
import { useGetSportsQuery } from "@/lib/api/courtCenterApi";
import { useCallback, useEffect } from "react";
import { debounce } from "lodash";

type FiltersFormProps = {
    onSubmit: (data: CourtCenterSearchFormValues) => void;
    initialValues?: CourtCenterSearchFormValues;
}

const FiltersForm = ({ onSubmit, initialValues }: FiltersFormProps) => {
    const { register, handleSubmit, setValue, getValues, watch } = useForm<CourtCenterSearchFormValues>({
        resolver: zodResolver(courtCenterSearchSchema),
        defaultValues: initialValues,
    });

    const debouncedSubmit = useCallback(
        debounce((data: CourtCenterSearchFormValues) => {
            onSubmit(data);
        }, 500),
        [onSubmit]
    );

    useEffect(() => {
        const subscription = watch((data) => {
            debouncedSubmit(data as CourtCenterSearchFormValues);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [watch, debouncedSubmit]);

    const { data: sports = [] } = useGetSportsQuery();
    const sportIds = getValues("sport_ids") ?? [];
    const sportOptions = sports.map((sport) => ({ label: sport.name, value: sport.id.toString() }));

    return (
        <form className="bg-white mt-4 shadow-lg p-10 rounded-4xl" onSubmit={handleSubmit(onSubmit)}>
            <h4 className="text-2xl font-bold mb-4">Filter your search</h4>
            <div className="flex flex-row gap-2">
                <div className="flex flex-col gap-2 w-full">
                    <AutocompleteLocationInput
                        id="address"
                        placeholder="Search for a location"
                        {...register("address")}
                        label=""
                        onLocationSelect={(location) => setValue("address", { lat: Number(location.latitude), lng: Number(location.longitude), radius_km: 20 })}
                    />
                </div>
                <div className="flex flex-col gap-2 w-full">
                    <SelectCore
                        placeholder="Select a sport"
                        items={sportOptions}
                        value={sportIds[0]}
                        onChange={(value) => setValue("sport_ids", value ? [value] : undefined)}
                    />
                </div>
            </div>
        </form>
    )
}

export default FiltersForm;