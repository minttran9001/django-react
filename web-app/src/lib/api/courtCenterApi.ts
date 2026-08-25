import { createApi } from "@reduxjs/toolkit/query/react";

import type {
  CourtCenter,
  CourtsUpdateRequest,
  DraftCreateRequest,
  DraftUpdateRequest,
  LocationUpdateRequest,
  SchedulesUpdateRequest,
  Sport,
  UploadImagesResponse,
} from "@/features/court-centers/types";
import { marketplaceBaseQuery } from "@/lib/api/baseApi";
import { getUserTimezone } from "@/lib/dates";

export type CourtCenterQueryArgs = {
  id: string;
  date?: string;
  timezone?: string;
  dateFrom?: string;
  dateTo?: string;
};

function withTimezone(timezone?: string) {
  return timezone ?? getUserTimezone();
}

function serializeCourtCenterArgs({
  id,
  date,
  dateFrom,
  dateTo,
  timezone,
}: CourtCenterQueryArgs) {
  return `${id}|${date ?? ""}|${dateFrom ?? ""}|${dateTo ?? ""}|${withTimezone(timezone)}`;
}

export const courtCenterApi = createApi({
  reducerPath: "courtCenterApi",
  baseQuery: marketplaceBaseQuery,
  tagTypes: ["Sports", "CourtCenters", "MyCourtCenters"],
  endpoints: (builder) => ({
    getCourtCenters: builder.query<
      number[],
      {
        lat?: number;
        lng?: number;
        radiusKm?: number;
        q?: string;
        sportIds?: string[];
        date?: string;
        timezone?: string;
      }
    >({
      query: (params) =>
        `/court-centers?${new URLSearchParams({
          ...(params.lat && { lat: params.lat.toString() }),
          ...(params.lng && { lng: params.lng.toString() }),
          ...(params.radiusKm && { radiusKm: params.radiusKm.toString() }),
          ...(params.q && { q: params.q }),
          ...(params.sportIds && { sportIds: params.sportIds.join(",") }),
          ...(params.date && { date: params.date }),
          timezone: withTimezone(params.timezone),
        }).toString()}`,
      transformResponse: (centers: CourtCenter[]) =>
        centers.map((center) => center.id),
      providesTags: (result) =>
        result
          ? [
              ...result.map((id) => ({
                type: "CourtCenters" as const,
                id,
              })),
              { type: "CourtCenters", id: "LIST" },
            ]
          : [{ type: "CourtCenters", id: "LIST" }],
    }),
    getCourtCenter: builder.query<{ id: number }, CourtCenterQueryArgs>({
      query: ({ id, date, dateFrom, dateTo, timezone }) => ({
        url: `/court-centers/${id}`,
        params: {
          ...(date ? { date } : {}),
          ...(dateFrom ? { dateFrom } : {}),
          ...(dateTo ? { dateTo } : {}),
          timezone: withTimezone(timezone),
        },
      }),
      transformResponse: (center: CourtCenter) => ({ id: center.id }),
      serializeQueryArgs: ({ queryArgs }) =>
        serializeCourtCenterArgs(queryArgs),
      providesTags: (_result, _error, { id }) => [{ type: "CourtCenters", id }],
    }),
    getMyCourtCenters: builder.query<CourtCenter[], void>({
      query: () => "/court-centers/mine",
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "MyCourtCenters" as const,
                id,
              })),
              { type: "MyCourtCenters", id: "LIST" },
            ]
          : [{ type: "MyCourtCenters", id: "LIST" }],
    }),
    getMyCourtCenter: builder.query<CourtCenter, string>({
      query: (id) => `/court-centers/mine/${id}`,
      providesTags: (_result, _error, id) => [{ type: "MyCourtCenters", id }],
    }),
    getSports: builder.query<Sport[], void>({
      query: () => "/sports",
      providesTags: ["Sports"],
    }),
    uploadImages: builder.mutation<UploadImagesResponse, File[]>({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        return {
          url: "/images/upload",
          method: "POST",
          body: formData,
        };
      },
    }),
    createDraft: builder.mutation<CourtCenter, DraftCreateRequest>({
      query: (body) => ({
        url: "/court-centers/create-draft",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "MyCourtCenters", id: "LIST" }],
    }),
    updateDraft: builder.mutation<
      CourtCenter,
      { id: string; body: DraftUpdateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/court-centers/mine/${id}`,
        method: "PATCH",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            courtCenterApi.util.upsertQueryData("getMyCourtCenter", id, data),
          );
        } catch {
          // Leave cache unchanged when the mutation fails.
        }
      },
      invalidatesTags: [{ type: "MyCourtCenters", id: "LIST" }],
    }),
    updateDraftSchedules: builder.mutation<
      CourtCenter,
      { id: string; body: SchedulesUpdateRequest }
    >({
      query: ({ id, body }) => ({
        url: `/court-centers/mine/${id}/schedules`,
        method: "PATCH",
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            courtCenterApi.util.upsertQueryData("getMyCourtCenter", id, data),
          );
        } catch {
          // Leave cache unchanged when the mutation fails.
        }
      },
      invalidatesTags: [{ type: "MyCourtCenters", id: "LIST" }],
    }),
    publishListing: builder.mutation<CourtCenter, string>({
      query: (id) => ({
        url: `/court-centers/mine/${id}/publish`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "MyCourtCenters", id },
        { type: "MyCourtCenters", id: "LIST" },
        { type: "CourtCenters", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCourtCentersQuery,
  useGetCourtCenterQuery,
  useGetMyCourtCentersQuery,
  useGetMyCourtCenterQuery,
  useGetSportsQuery,
  useUploadImagesMutation,
  useCreateDraftMutation,
  useUpdateDraftMutation,
  useUpdateDraftSchedulesMutation,
  usePublishListingMutation,
} = courtCenterApi;

export type {
  CourtsUpdateRequest,
  DraftCreateRequest,
  LocationUpdateRequest,
  SchedulesUpdateRequest,
};
