import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  CourtCenter,
  CreateCourtCenterRequest,
  Sport,
  UpdateCourtCenterRequest,
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
    createCourtCenter: builder.mutation<CourtCenter, CreateCourtCenterRequest>({
      query: (body) => ({
        url: "/court-centers/create",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        { type: "CourtCenters", id: "LIST" },
        { type: "MyCourtCenters", id: "LIST" },
      ],
    }),
    updateCourtCenter: builder.mutation<
      CourtCenter,
      { id: string; body: UpdateCourtCenterRequest }
    >({
      query: ({ id, body }) => ({
        url: `/court-centers/mine/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
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
  useCreateCourtCenterMutation,
  useUpdateCourtCenterMutation,
} = courtCenterApi;
