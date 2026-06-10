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

export const courtCenterApi = createApi({
  reducerPath: "courtCenterApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Sports", "CourtCenters", "MyCourtCenters"],
  endpoints: (builder) => ({
    getCourtCenters: builder.query<CourtCenter[], void>({
      query: () => "/court-centers",
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
