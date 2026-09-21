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

const rawChatBaseQuery = fetchBaseQuery({
  baseUrl: `${env.NEXT_PUBLIC_CHAT_API_URL}/api`,
  credentials: "include",
});

async function refreshAccessToken(
  api: BaseQueryApi,
  extraOptions: object,
): Promise<boolean> {
  // Always refresh via Django auth API.
  const result = await rawBaseQuery(
    { url: "/token/refresh", method: "POST", body: {} },
    api,
    extraOptions,
  );
  return !result.error;
}

let refreshPromise: Promise<boolean> | null = null;

function withReauth(
  query: typeof rawBaseQuery,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return async (args, api, extraOptions) => {
    const result = await query(args, api, extraOptions);
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

    const retry = await query(args, api, extraOptions);
    // Refresh succeeded but chat/API still 401 (e.g. JWT secret mismatch) —
    // do not keep retrying forever via RTK refetch loops.
    if (retry.error?.status === 401) {
      return retry;
    }
    return retry;
  };
}

export const baseQueryWithReauth = withReauth(rawBaseQuery);
const chatBaseQueryWithReauth = withReauth(rawChatBaseQuery);

function withMarketplaceIngest(
  query: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>,
): BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> {
  return async (args, api, extraOptions) => {
    const result = await query(args, api, extraOptions);
    if (result.error || result.data === undefined) return result;
    api.dispatch(addMarketplaceData(result.data));
    return { ...result, data: unwrapDeep(result.data) };
  };
}

/** Ingest `{ type, data }` envelopes into marketplace, then unwrap for RTK/UI. */
export const marketplaceBaseQuery = withMarketplaceIngest(baseQueryWithReauth);

/** Same unwrap/ingest as marketplace, but chat REST hits the Node messaging service. */
export const chatMarketplaceBaseQuery = withMarketplaceIngest(
  chatBaseQueryWithReauth,
);

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
