import { env } from "@/lib/env";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { SendMessageInput } from "@/lib/types/message";
import {
  ChatMessage,
  EMessageStatus,
  MessageListResponse,
  MessageResponse,
} from "@/lib/types/message";
import { Conversation } from "@/lib/types/conversation";
import { getChatLocalDb } from "@/lib/localDb";
import { authApi } from "../authApi";
import { conversationApi } from "../conversationApi/conversationApi";

const DEFAULT_PAGE_SIZE = 40;

/** `null` = first page (latest). Number = `beforeId` cursor for older pages. */
export type MessagesPageParam = number | null;

type GetMessagesArg = {
  conversationId: Conversation["id"];
  limit?: number;
};

const createOptimisticMessage = (
  data: { conversationId: Conversation["id"]; body: string; clientId: string },
  currentUserId: number,
): ChatMessage => {
  return {
    // Temporary until server assigns a real id
    id: -Date.now(),
    clientId: data.clientId,
    conversationId: data.conversationId,
    body: data.body,
    status: EMessageStatus.PENDING,
    sender: {
      id: currentUserId,
    },
    createdAt: Date.now(),
  };
};

export const messageApi = createApi({
  reducerPath: "messageApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${env.NEXT_PUBLIC_API_URL}/api`,
    credentials: "include",
  }),
  tagTypes: ["Messages"],
  endpoints: (builder) => ({
    sendMessage: builder.mutation<MessageResponse, SendMessageInput>({
      // @ts-expect-error - queryFn is not typed
      queryFn: async (
        data,
        { getState, dispatch },
        _extraOptions,
        baseQuery,
      ) => {
        try {
          const { conversationId, body } = data;
          const currentUser = authApi.endpoints.getMe.select()(
            getState() as never,
          );
          const clientId = crypto.randomUUID();
          const currentUserId = currentUser.data?.id;
          if (!currentUserId) {
            throw new Error("Current user not found");
          }
          const optimistic = createOptimisticMessage(
            { ...data, clientId },
            currentUserId,
          );

          dispatch(
            messageApi.util.updateQueryData(
              "getMessages",
              { conversationId },
              (draft) => {
                if (draft.pages.length === 0) {
                  draft.pages.push({
                    results: [optimistic],
                    hasMore: false,
                    nextBeforeId: null,
                  });
                  draft.pageParams.push(null);
                  return;
                }
                // pages[0] is the newest chunk — append outgoing message there
                draft.pages[0].results.push(optimistic);
              },
            ),
          );

          // dispatch preview message for conversation list
          dispatch(
            conversationApi.util.updateQueryData(
              "getConversations",
              undefined,
              (draft) => {
                const conversation = Object.values(draft).find(
                  (c: Conversation) => c.id === conversationId,
                );
                if (!conversation) return;
                conversation.lastMessageAt = optimistic.createdAt;
                conversation.lastMessagePreview = optimistic.body;
                conversation.lastMessageSender.user.name =
                  optimistic.sender.name ?? "";
                conversation.lastMessageSender.user.id = optimistic.sender.id;
                conversation.lastMessageSender.user.avatar =
                  currentUser.data?.avatar ?? null;
              },
            ),
          );
          const db = getChatLocalDb();

          await db.messages.add(optimistic);

          const response = await baseQuery({
            url: "/messages/send",
            method: "POST",
            body: {
              ...data,
              clientId,
            },
          });
          return response;
        } catch (error) {
          return { error };
        }
      },
    }),
    getMessages: builder.infiniteQuery<
      MessageListResponse,
      GetMessagesArg,
      MessagesPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => {
          if (!lastPage.hasMore) return undefined;
          // Prefer server cursor; fall back to oldest id in the page
          return lastPage.nextBeforeId ?? lastPage.results[0]?.id;
        },
      },
      queryFn: async (
        { queryArg, pageParam },
        _api,
        _extraOptions,
        baseQuery,
      ) => {
        const { conversationId, limit = DEFAULT_PAGE_SIZE } = queryArg;
        const beforeId = pageParam ?? undefined;

        const response = await baseQuery({
          url: `/messages/${conversationId}`,
          params: {
            ...(beforeId != null ? { beforeId: beforeId.toString() } : {}),
            limit: limit.toString(),
          },
        });

        if (response.error) {
          return { error: response.error };
        }

        const data = response.data as MessageListResponse;
        const db = getChatLocalDb();
        if (data.results?.length) {
          await db.messages.bulkPut(data.results);
        }

        await db.setConversationMetadata({
          conversationId,
          nextBeforeId: data.nextBeforeId,
          hasMore: data.hasMore,
        });

        return { data };
      },
      providesTags: ["Messages"],
    }),
  }),
});

export const { useSendMessageMutation, useGetMessagesInfiniteQuery } =
  messageApi;
