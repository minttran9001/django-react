import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

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
import { env } from "@/lib/env";

export type CourtCenterQueryArgs = {
  id: string;
  date?: string;
};

function serializeCourtCenterArgs({ id, date }: CourtCenterQueryArgs) {
  return `${id}|${date ?? ""}`;
}

export const courtCenterApi = createApi({
  reducerPath: "courtCenterApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Sports", "CourtCenters", "MyCourtCenters"],
  endpoints: (builder) => ({
    getCourtCenters: builder.query<
      CourtCenter[],
      {
        lat?: number;
        lng?: number;
        radius_km?: number;
        q?: string;
        sport_ids?: string[];
        date?: string;
      }
    >({
      query: (params) =>
        `/court-centers?${new URLSearchParams({
          ...(params.lat && { lat: params.lat.toString() }),
          ...(params.lng && { lng: params.lng.toString() }),
          ...(params.radius_km && { radius_km: params.radius_km.toString() }),
          ...(params.q && { q: params.q }),
          ...(params.sport_ids && { sport_ids: params.sport_ids.join(",") }),
          ...(params.date && { date: params.date }),
        }).toString()}`,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({
                type: "CourtCenters" as const,
                id,
              })),
              { type: "CourtCenters", id: "LIST" },
            ]
          : [{ type: "CourtCenters", id: "LIST" }],
    }),
    getCourtCenter: builder.query<CourtCenter, CourtCenterQueryArgs>({
      query: ({ id, date }) => ({
        url: `/court-centers/${id}`,
        params: date ? { date } : undefined,
      }),
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
