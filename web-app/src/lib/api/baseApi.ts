import {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import { env } from "@/lib/env";
import { authApi } from "./authApi";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
  credentials: "include",
});

async function refreshAccessToken(
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> {
  const result = await rawBaseQuery(
    { url: "/token/refresh", method: "POST", body: {} },
    api,
    extraOptions,
  );
  return !result.error;
}

let refreshPromise: Promise<boolean> | null = null;

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status !== 401) return result;

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken(api, extraOptions).finally(() => {
      refreshPromise = null;
    });
  }

  const ok = await refreshPromise;
  if (!ok) {
    api.dispatch(authApi.endpoints.logout.initiate());
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return result;
  }

  return rawBaseQuery(args, api, extraOptions);
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Notes",
    "SpeculatedLineItems",
    "Transaction",
    "Me",
    "UserProfile",
    "Conversations",
    "Messages",
  ],
  endpoints: () => ({}),
});
