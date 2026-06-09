import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import type { CurrentUser, MeResponse } from "@/lib/auth/types";
import { env } from "@/lib/env";

export type { CurrentUser, MeResponse };

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Me"],
  endpoints: (builder) => ({
    getMe: builder.query<CurrentUser | null, void>({
      query: () => "/me",
      providesTags: ["Me"],
      transformResponse: (response: { user: CurrentUser }) => response.user,
    }),
    login: builder.mutation<MeResponse, LoginRequest>({
      query: (body) => ({
        url: "/token",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data.user));
        } catch {
          dispatch(authApi.util.upsertQueryData("getMe", undefined, null));
        }
      },
    }),
    register: builder.mutation<CurrentUser | null, RegisterRequest>({
      query: (body) => ({
        url: "/register",
        method: "POST",
        body,
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(authApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          dispatch(authApi.util.upsertQueryData("getMe", undefined, null));
        }
      },
    }),
    logout: builder.mutation<{ success: true }, void>({
      query: () => ({
        url: "/logout",
        method: "POST",
      }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
        } finally {
          dispatch(authApi.util.upsertQueryData("getMe", undefined, null));
        }
      },
    }),
    verifyEmail: builder.mutation<
      { success: true },
      { email: string; token: string }
    >({
      query: (body) => ({
        url: "/verify-email",
        method: "POST",
        body,
      }),
    }),
    resendVerificationEmail: builder.mutation<
      { success: true },
      { email: string }
    >({
      query: (body) => ({
        url: "/resend-verification-email",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useResendVerificationEmailMutation,
} = authApi;
