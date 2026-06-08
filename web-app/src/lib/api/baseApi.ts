import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { env } from "@/lib/env";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Notes"],
  endpoints: () => ({}),
});
