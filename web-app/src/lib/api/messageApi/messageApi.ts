import { createApi } from "@reduxjs/toolkit/query/react";
import { SendMessageInput } from "@/lib/types/message";
import {
  ChatMessage,
  EMessageStatus,
  MessageListResponse,
  MessageResponse,
} from "@/lib/types/message";
import { Conversation } from "@/lib/types/conversation";
import { getChatLocalDb } from "@/lib/localDb";
import { baseQueryWithReauth } from "@/lib/api/baseApi";
import { authApi } from "../authApi";
import { conversationApi } from "../conversationApi/conversationApi";

const DEFAULT_PAGE_SIZE = 40;

/** `null` = first page (latest). Number = `beforeId` cursor for older pages. */
export type MessagesPageParam = number | null;

type GetMessagesArg = {
  conversationId: Conversation["id"];
  limit?: number;
};

const STATUS_RANK: Record<string, number> = {
  [EMessageStatus.FAILED]: -1,
  [EMessageStatus.PENDING]: 0,
  [EMessageStatus.SENT]: 1,
  [EMessageStatus.ACKED]: 2,
};

const mergeMessages = (
  localMessages: ChatMessage[],
  serverMessages: ChatMessage[],
): ChatMessage[] => {
  const merged = new Map<string, ChatMessage>();

  for (const message of [...localMessages, ...serverMessages]) {
    const prev = merged.get(message.clientId);
    if (!prev) {
      merged.set(message.clientId, message);
      continue;
    }
    const prevRank = STATUS_RANK[prev.status] ?? 0;
    const nextRank = STATUS_RANK[message.status] ?? 0;
    if (nextRank !== prevRank) {
      merged.set(message.clientId, nextRank > prevRank ? message : prev);
      continue;
    }
    // Prefer real server ids over temporary negative ids.
    if (message.id > 0 !== prev.id > 0) {
      merged.set(message.clientId, message.id > 0 ? message : prev);
      continue;
    }
    merged.set(message.clientId, message);
  }

  return [...merged.values()].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
};

/** Build infinite-query pages from locally cached messages (ascending by time). */
export function buildLocalMessagePages(
  messages: ChatMessage[],
  pageSize = DEFAULT_PAGE_SIZE,
): { pages: MessageListResponse[]; pageParams: MessagesPageParam[] } {
  if (messages.length === 0) {
    return { pages: [], pageParams: [] };
  }

  const pages: MessageListResponse[] = [];
  let end = messages.length;
  const pageParams: MessagesPageParam[] = [];
  while (end > 0) {
    const start = Math.max(0, end - pageSize);
    const results = messages.slice(start, end);
    pages.push({
      results,
      nextBeforeId: results[0].id,
      hasMore: true,
    });
    pageParams.push(results[0].id);
    end = start;
  }

  return { pages, pageParams };
}

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
  baseQuery: baseQueryWithReauth,
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
        const db = getChatLocalDb();
        const { conversationId } = data;
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

        await db.messages.add(optimistic);
        await db.outbox.put(optimistic);
        try {
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

        const db = getChatLocalDb();

        const response = await baseQuery({
          url: `/messages/${conversationId}`,
          params: {
            ...(beforeId != null ? { beforeId: beforeId.toString() } : {}),
            limit: limit.toString(),
          },
        });

        const data = response.data as MessageListResponse;
        if (data?.results?.length > 0) {
          await db.messages.bulkPut(data.results);

          if (!beforeId) {
            const pendingMessages = await db.getPendingMessages();
            const mergedMessages = mergeMessages(pendingMessages, data.results);
            return {
              data: {
                results: mergedMessages,
                nextBeforeId: data.nextBeforeId,
                hasMore: data.hasMore,
              },
            };
          }

          return {
            data: {
              results: data.results,
              nextBeforeId: data.nextBeforeId,
              hasMore: data.hasMore,
            },
          };
        }

        const local = await db.getMessagesByConversationIdAndPage(
          conversationId,
          beforeId ?? 0,
          limit,
        );
        if (local.length > 0) {
          return {
            data: {
              results: local,
              nextBeforeId: local[0].id,
              hasMore: true,
            },
          };
        }
        return {
          data: {
            results: [],
            nextBeforeId: null,
            hasMore: false,
          },
        };
      },
      providesTags: ["Messages"],
    }),
    drainOutbox: builder.mutation<{ count: number }, void>({
      queryFn: async (_arg, _api, _extraOptions, baseQuery) => {
        const db = getChatLocalDb();
        const outbox = await db.outbox.orderBy("createdAt").toArray();
        let count = 0;
        for (const item of outbox) {
          await baseQuery({
            url: "/messages/send",
            method: "POST",
            body: item,
          });
          count++;
        }

        return { data: { count } };
      },
    }),
  }),
});

export const {
  useSendMessageMutation,
  useGetMessagesInfiniteQuery,
  useDrainOutboxMutation,
} = messageApi;
