"use client";

import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormContext, useWatch } from "react-hook-form";

import {
  AutocompleteLocationInput,
  type LocationSelection,
} from "@/components/location/AutocompleteLocationInput";
import type { LocationFormValues } from "@/features/auth/schemas/locationSchema";

import { FieldShell } from "./FieldShell";
import { useFormField } from "./hooks/useFormField";
import type { BaseFieldProps } from "./types";

export type FieldAddressInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  value: LocationFormValues;
  onChange: (value: LocationFormValues) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function FieldAddressInputComponent({
  id,
  label,
  description,
  error,
  containerClassName,
  value,
  onChange,
  placeholder,
  disabled,
}: FieldAddressInputComponentProps) {
  const hasSelectedLocation =
    value.address &&
    value.lat != null &&
    value.lng != null;

  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <AutocompleteLocationInput
        id={id}
        label=""
        placeholder={placeholder}
        disabled={disabled}
        query={value.query ?? ""}
        setQuery={(query) => {
          if (query === (value.query ?? "")) {
            return;
          }

          const selectedAddress = value.address ?? "";

          if (!query.trim()) {
            onChange({
              ...value,
              query: "",
              address: "",
              lat: undefined,
              lng: undefined,
            });
            return;
          }

          if (selectedAddress && query !== selectedAddress) {
            onChange({
              ...value,
              query,
              address: "",
              lat: undefined,
              lng: undefined,
            });
            return;
          }

          onChange({ ...value, query });
        }}
        location={
          hasSelectedLocation
            ? {
              address: value.address ?? "",
              latitude: value.lat!.toString(),
              longitude: value.lng!.toString(),
            }
            : undefined
        }
        onLocationSelect={(location) => {
          if (!location) {
            onChange({
              ...value,
              lat: undefined,
              lng: undefined,
              address: "",
              query: "",
            });
            return;
          }

          onChange({
            ...value,
            lat: location.latitude ? Number(location.latitude) : undefined,
            lng: location.longitude ? Number(location.longitude) : undefined,
            address: location.address,
            query: location.address,
          });
        }}
      />
    </FieldShell>
  );
}

type FieldAddressInputProps<TFieldValues extends FieldValues> =
  BaseFieldProps<TFieldValues> &
  Omit<
    FieldAddressInputComponentProps,
    | "value"
    | "onChange"
    | "error"
    | "invalid"
    | "label"
    | "description"
    | "containerClassName"
  > & {
    onValueChange?: (value: LocationFormValues) => void;
  };

export function FieldAddressInput<TFieldValues extends FieldValues>({
  name,
  label,
  description,
  containerClassName,
  disabled,
  onValueChange,
  ...props
}: FieldAddressInputProps<TFieldValues>) {
  const { field, errorMessage, invalid, id } = useFormField<
    TFieldValues,
    typeof name
  >(name);

  const value = (field.value ?? {}) as LocationFormValues;

  return (
    <FieldAddressInputComponent
      id={id}
      label={label}
      description={description}
      value={value}
      onChange={(nextValue) => {
        field.onChange(nextValue);
        onValueChange?.(nextValue);
      }}
      error={errorMessage}
      invalid={invalid}
      disabled={disabled}
      containerClassName={containerClassName}
      {...props}
    />
  );
}

export type FieldLocationInputComponentProps = {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  invalid?: boolean;
  containerClassName?: string;
  defaultValue?: string;
  location?: LocationSelection;
  onLocationSelect: (location: LocationSelection | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FieldLocationInputComponent({
  id,
  label,
  description,
  error,
  containerClassName,
  defaultValue,
  location,
  onLocationSelect,
  disabled,
  placeholder,
}: FieldLocationInputComponentProps) {
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      containerClassName={containerClassName}
    >
      <AutocompleteLocationInput
        id={id}
        label=""
        placeholder={placeholder}
        disabled={disabled}
        defaultValue={defaultValue}
        location={location}
        onLocationSelect={onLocationSelect}
      />
    </FieldShell>
  );
}

type FieldLocationInputProps<TFieldValues extends FieldValues> = {
  name: BaseFieldProps<TFieldValues>["name"];
  latitudeName: BaseFieldProps<TFieldValues>["name"];
  longitudeName: BaseFieldProps<TFieldValues>["name"];
  label?: string;
  description?: string;
  containerClassName?: string;
  defaultValue?: string;
  disabled?: boolean;
  placeholder?: string;
};

export function FieldLocationInput<TFieldValues extends FieldValues>({
  name,
  latitudeName,
  longitudeName,
  label,
  description,
  containerClassName,
  defaultValue,
  disabled,
  placeholder,
}: FieldLocationInputProps<TFieldValues>) {
  const { setValue, control } = useFormContext<TFieldValues>();
  const { errorMessage, invalid, id } = useFormField<TFieldValues, typeof name>(
    name,
  );

  const address = useWatch({ control, name });
  const latitude = useWatch({ control, name: latitudeName });
  const longitude = useWatch({ control, name: longitudeName });

  const location =
    address && latitude && longitude
      ? {
        address: String(address),
        latitude: String(latitude),
        longitude: String(longitude),
      }
      : undefined;

  return (
    <FieldLocationInputComponent
      id={id}
      label={label}
      description={description}
      error={errorMessage}
      invalid={invalid}
      defaultValue={defaultValue ?? (address ? String(address) : undefined)}
      location={location}
      disabled={disabled}
      placeholder={placeholder}
      containerClassName={containerClassName}
      onLocationSelect={(selection) => {
        setValue(name, (selection?.address ?? "") as TFieldValues[typeof name], {
          shouldValidate: true,
        });
        setValue(
          latitudeName,
          (selection?.latitude ?? "") as TFieldValues[typeof latitudeName],
          { shouldValidate: true },
        );
        setValue(
          longitudeName,
          (selection?.longitude ?? "") as TFieldValues[typeof longitudeName],
          { shouldValidate: true },
        );
      }}
    />
  );
}

export function FieldHiddenInput<TFieldValues extends FieldValues>({
  name,
  valueAsNumber,
}: {
  name: FieldPath<TFieldValues>;
  valueAsNumber?: boolean;
}) {
  const { register } = useFormContext<TFieldValues>();

  return <input type="hidden" {...register(name, { valueAsNumber })} />;
}
