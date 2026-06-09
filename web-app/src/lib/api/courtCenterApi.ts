import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  CourtCenter,
  CourtCenterImage,
  CreateCourtCenterRequest,
  Sport,
} from "@/features/court-centers/types";
import { env } from "@/lib/env";

export interface UploadImageRequest {
  file: File;
  contentType: "courtcenter" | "court";
  objectId: number;
  kind: "logo" | "gallery";
  caption?: string;
  sortOrder?: number;
}

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
    getSports: builder.query<Sport[], void>({
      query: () => "/sports",
      providesTags: ["Sports"],
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
    uploadImage: builder.mutation<CourtCenterImage, UploadImageRequest>({
      query: ({ file, contentType, objectId, kind, caption, sortOrder }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("content_type", contentType);
        formData.append("object_id", String(objectId));
        formData.append("kind", kind);
        if (caption) formData.append("caption", caption);
        if (sortOrder !== undefined) {
          formData.append("sort_order", String(sortOrder));
        }
        return {
          url: "/images",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: [
        { type: "CourtCenters", id: "LIST" },
        { type: "MyCourtCenters", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCourtCentersQuery,
  useGetMyCourtCentersQuery,
  useGetSportsQuery,
  useCreateCourtCenterMutation,
  useUploadImageMutation,
} = courtCenterApi;
