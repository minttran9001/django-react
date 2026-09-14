import { createApi } from "@reduxjs/toolkit/query/react";
import type { AppDispatch } from "@/lib/store";

import { Conversation, ConversationMember } from "../../types/conversation";
import { getChatLocalDb } from "@/lib/localDb";
import { marketplaceBaseQuery } from "@/lib/api/baseApi";
import { ingestTyped } from "@/lib/marketplace/ingest";
import { authApi } from "../authApi";
import {
  marketplaceConversationSelectors,
  updateMarketplaceConversation,
} from "@/lib/slices/marketplaceData/slice";
import { laterDate } from "@/lib/dates";

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
        await db?.putConversations(list);

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
        const fetchedConversationIds =
          conversationApi.endpoints.getConversations.select()(
            getState() as never,
          ).data?.ids;

        const cachedConversations = fetchedConversationIds?.map((id) =>
          marketplaceConversationSelectors.selectById(getState() as never, id),
        ) as Conversation[];

        const dmConversation = cachedConversations?.find(
          (conversation): conversation is Conversation =>
            conversation?.type === "dm" &&
            conversation?.members.some((member) => member.user.id === userId),
        );

        if (dmConversation) {
          appendConversationId(dispatch, getState, dmConversation.id);
          return { data: dmConversation.id };
        }

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
        if (user.data?.id) {
          const db = getChatLocalDb(user.data.id);
          await db.putConversation(conversation);
        }
        appendConversationId(dispatch, getState, conversation.id);
        return { data: conversation.id };
      },
      providesTags: (_result, _error, { userId }) => [
        { type: "Conversations", id: `dm_${userId}` },
      ],
    }),
    markConversationSeen: builder.mutation<
      { success: boolean },
      {
        conversationId: number;
        createdAt: Date;
        clientId?: string;
      }
    >({
      queryFn: async (
        { conversationId, createdAt, clientId },
        { getState, dispatch },
        _extraOptions,
        baseQuery,
      ) => {
        const currentUser = authApi.endpoints.getMe.select()(
          getState() as never,
        );

        const conversation = marketplaceConversationSelectors.selectById(
          getState() as never,
          conversationId,
        );

        if (conversation) {
          const meAsMember = conversation.members.find(
            (member) => member.user.id === currentUser.data?.id,
          );

          if (meAsMember) {
            if (
              meAsMember.lastReadMessageCreatedAt.getTime() >=
              createdAt.getTime()
            ) {
              return { data: { success: true } };
            }
            const newMeAsMember: ConversationMember = {
              ...meAsMember,
              lastReadMessageCreatedAt: laterDate(
                meAsMember.lastReadMessageCreatedAt,
                createdAt,
              ),
              unread: 0,
            };
            const db = getChatLocalDb(currentUser.data?.id);
            const changes = {
              members: conversation.members.map((member) =>
                member.user.id === currentUser.data?.id
                  ? newMeAsMember
                  : member,
              ),
            };
            await db?.putConversation({
              ...conversation,
              ...changes,
            });
            void dispatch(
              updateMarketplaceConversation({
                id: conversationId,
                changes,
              }),
            );
          }
        }

        const response = await baseQuery({
          url: `/conversations/${conversationId}/seen`,
          method: "POST",
          body: {
            createdAt: createdAt.toISOString(),
            ...(clientId ? { clientId } : {}),
          },
        });

        if (response.error) {
          return { error: response.error };
        }
        return { data: { success: true } };
      },
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetDirectConversationQuery,
  useLazyGetDirectConversationQuery,
  useMarkConversationSeenMutation,
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
