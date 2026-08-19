import { createApi } from "@reduxjs/toolkit/query/react";
import { Conversation } from "../../types/conversation";
import { getChatLocalDb } from "@/lib/localDb";
import { baseQueryWithReauth } from "@/lib/api/baseApi";

function conversationsById(
  conversations: Conversation[],
): Record<string, Conversation> {
  const sorted = [...conversations].sort(
    (a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0),
  );
  return sorted.reduce(
    (acc, conversation) => {
      acc[String(conversation.id)] = conversation;
      return acc;
    },
    {} as Record<string, Conversation>,
  );
}

export const conversationApi = createApi({
  reducerPath: "conversationApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Conversations"],
  endpoints: (builder) => ({
    getConversations: builder.query<Record<string, Conversation>, void>({
      async queryFn(_arg, _api, _extraOptions, baseQuery) {
        const response = await baseQuery({
          url: "/conversations",
        });

        if (response.error) {
          return { error: response.error };
        }

        const list = response.data as Conversation[];
        const db = getChatLocalDb();
        await db.conversations.bulkPut(list);

        // queryFn skips transformResponse — normalize here to match cache shape.
        return { data: conversationsById(list) };
      },
      providesTags: ["Conversations"],
    }),
  }),
});

export const { useGetConversationsQuery } = conversationApi;
