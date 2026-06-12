"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  CourtCenterSearchFormValues,
  courtCenterSearchSchema,
} from "@/features/auth/schemas/courtCenterSearchSchema";
import {
  FieldAddressInput,
  FieldMultiSelect,
  Form,
} from "@/components/form";
import { useGetSportsQuery } from "@/lib/api/courtCenterApi";
import { Button } from "@/components/ui/button";

type FiltersFormProps = {
  onSubmit: (data: CourtCenterSearchFormValues) => void;
  initialValues?: CourtCenterSearchFormValues;
};

const FiltersForm = ({ onSubmit, initialValues }: FiltersFormProps) => {
  const form = useForm<CourtCenterSearchFormValues>({
    resolver: zodResolver(courtCenterSearchSchema),
    defaultValues: initialValues,
  });

  const { data: sports = [] } = useGetSportsQuery();
  const sportOptions = sports.map((sport) => ({
    label: sport.name,
    value: sport.id.toString(),
  }));

  const {
    formState: { isSubmitting },
    reset,
  } = form;

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
    onSubmit(resetValues);
  };

  return (
    <Form
      form={form}
      onSubmit={onSubmit}
      className="mt-4 flex flex-col gap-4 rounded-4xl bg-white p-10 shadow-lg"
    >
      <h4 className="text-2xl font-bold">Filter your search</h4>
      <div className="flex flex-row gap-2">
        <FieldAddressInput<CourtCenterSearchFormValues>
          name="address"
          placeholder="Search for a location"
          containerClassName="w-full"
        />
        <FieldMultiSelect<CourtCenterSearchFormValues>
          name="sport_ids"
          placeholder="Select a sport"
          items={sportOptions}
          containerClassName="w-full"
        />
      </div>
      <div className="flex flex-row gap-2 self-end">
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          isLoading={isSubmitting}
          onClick={onClearFilters}
        >
          Clear Filters
        </Button>
        <Button type="submit" disabled={isSubmitting} isLoading={isSubmitting}>
          Filter
        </Button>
      </div>
    </Form>
  );
};

export default FiltersForm;
