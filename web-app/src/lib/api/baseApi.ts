import {
  BaseQueryApi,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

import { unwrapDeep } from "@/lib/marketplace/typedResource";
import { addMarketplaceData } from "@/lib/slices/marketplaceData/slice";
import { env } from "@/lib/env";
import { authApi } from "./authApi";
import { closeChatLocalDb } from "../localDb";

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
      closeChatLocalDb();
      window.location.href = "/login";
    }
    return result;
  }

  return rawBaseQuery(args, api, extraOptions);
};

/** Ingest `{ type, data }` envelopes into marketplace, then unwrap for RTK/UI. */
export const marketplaceBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQueryWithReauth(args, api, extraOptions);
  if (result.error || result.data === undefined) return result;
  api.dispatch(addMarketplaceData(result.data));
  return { ...result, data: unwrapDeep(result.data) };
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: marketplaceBaseQuery,
  tagTypes: [
    "Notes",
    "SpeculatedLineItems",
    "Transaction",
    "Me",
    "UserProfile",
    "Users",
    "Conversations",
    "Messages",
  ],
  endpoints: () => ({}),
});
