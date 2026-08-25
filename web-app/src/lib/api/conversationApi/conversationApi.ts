import { createApi } from "@reduxjs/toolkit/query/react";
import type { AppDispatch } from "@/lib/store";

import { Conversation } from "../../types/conversation";
import { getChatLocalDb } from "@/lib/localDb";
import { marketplaceBaseQuery } from "@/lib/api/baseApi";
import { ingestTyped } from "@/lib/marketplace/ingest";
import { authApi } from "../authApi";

export type ConversationInbox = {
  ids: number[];
};

type AppThunkDispatch = AppDispatch;

export function appendConversationId(
  dispatch: AppThunkDispatch,
  getState: () => unknown,
  conversationId: number,
) {
  const inbox = conversationApi.endpoints.getConversations.select()(
    getState() as never,
  ).data;
  if (inbox) {
    dispatch(
      conversationApi.util.updateQueryData(
        "getConversations",
        undefined,
        (draft) => {
          draft.ids = [
            conversationId,
            ...draft.ids.filter((id) => id !== conversationId),
          ];
        },
      ),
    );
    return;
  }
  dispatch(
    conversationApi.util.upsertQueryData("getConversations", undefined, {
      ids: [conversationId],
    }),
  );
}

export const conversationApi = createApi({
  reducerPath: "conversationApi",
  baseQuery: marketplaceBaseQuery,
  tagTypes: ["Conversations"],
  endpoints: (builder) => ({
    getConversations: builder.query<ConversationInbox, void>({
      async queryFn(_arg, { getState }, _extraOptions, baseQuery) {
        const user = authApi.endpoints.getMe.select()(getState() as never);
        const response = await baseQuery({
          url: "/conversations",
        });

        if (response.error) {
          return { error: response.error };
        }

        const list = (response.data as Conversation[] | null) ?? [];
        const db = getChatLocalDb(user.data?.id);
        await db.conversations.bulkPut(list);

        return { data: { ids: list.map((conversation) => conversation.id) } };
      },
      providesTags: ["Conversations"],
    }),
    getDirectConversation: builder.query<number | null, { userId: number }>({
      async queryFn(
        { userId },
        { dispatch, getState },
        _extraOptions,
        baseQuery,
      ) {
        const response = await baseQuery({
          url: "/conversations/dm",
          params: { userId },
        });
        if (response.error) {
          return { error: response.error };
        }
        const conversation = (response.data as Conversation | null) ?? null;
        if (!conversation) {
          return { data: null };
        }
        const user = authApi.endpoints.getMe.select()(getState() as never);
        const db = getChatLocalDb(user.data?.id);
        await db.conversations.put(conversation);
        appendConversationId(dispatch, getState, conversation.id);
        return { data: conversation.id };
      },
      providesTags: (_result, _error, { userId }) => [
        { type: "Conversations", id: `dm_${userId}` },
      ],
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetDirectConversationQuery,
  useLazyGetDirectConversationQuery,
} = conversationApi;

/** Dexie / socket payloads that are already unwrapped. */
export function upsertConversationInCache(
  dispatch: AppThunkDispatch,
  getState: () => unknown,
  conversation: Conversation,
) {
  ingestTyped(dispatch, "conversation", conversation);
  appendConversationId(dispatch, getState, conversation.id);
}
