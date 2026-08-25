import { baseApi } from "@/lib/api/baseApi";
import type { PublicUser } from "@/lib/types/conversation";

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPublicUser: builder.query<{ id: number }, number>({
      query: (id) => `/users/${id}`,
      transformResponse: (user: PublicUser) => ({ id: user.id }),
      providesTags: (_result, _error, id) => [{ type: "Users", id }],
    }),
  }),
});

export const { useGetPublicUserQuery, useLazyGetPublicUserQuery } = usersApi;
