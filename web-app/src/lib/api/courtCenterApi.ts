import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type {
  CourtCenter,
  CreateCourtCenterRequest,
  Sport,
} from "@/features/court-centers/types";
import { env } from "@/lib/env";

export const courtCenterApi = createApi({
  reducerPath: "courtCenterApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Sports", "CourtCenters"],
  endpoints: (builder) => ({
    getSports: builder.query<Sport[], void>({
      query: () => "/sports",
      providesTags: ["Sports"],
    }),
    createCourtCenter: builder.mutation<CourtCenter, CreateCourtCenterRequest>({
      query: (body) => ({
        url: "/court-centers",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CourtCenters"],
    }),
  }),
});

export const { useGetSportsQuery, useCreateCourtCenterMutation } = courtCenterApi;
