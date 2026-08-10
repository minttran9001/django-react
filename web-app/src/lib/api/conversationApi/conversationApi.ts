import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Conversation } from "../../types/conversation";
import { env } from "../../env";

export const conversationApi = createApi({
  reducerPath: "conversationApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Conversations"],
  endpoints: (builder) => ({
    getConversations: builder.query<Record<string, Conversation>, void>({
      query: () => "/conversations",
      providesTags: ["Conversations"],
      transformResponse: (response: Conversation[]) => {
        const byIds: Record<string, Conversation> = {};
        for (const conversation of response) {
          byIds[conversation.id] = conversation;
        }
        const sortedByIds = Object.values(byIds).sort(
          (a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0),
        );
        return sortedByIds.reduce(
          (acc, conversation) => {
            acc[conversation.id] = conversation;
            return acc;
          },
          {} as Record<string, Conversation>,
        );
      },
    }),
  }),
});

export const { useGetConversationsQuery } = conversationApi;
