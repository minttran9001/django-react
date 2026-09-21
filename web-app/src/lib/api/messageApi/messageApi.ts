import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import type { AppDispatch } from "@/lib/store";
import { OutboxItem, SendMessageInput } from "@/lib/types/message";
import {
  ChatMessage,
  EMessageStatus,
  MessageListResponse,
  MessageResponse,
  normalizeChatMessage,
} from "@/lib/types/message";
import { Conversation, PublicUser } from "@/lib/types/conversation";
import { compareDateAsc } from "@/lib/dates";
import { getChatLocalDb } from "@/lib/localDb";
import { chatMarketplaceBaseQuery } from "@/lib/api/baseApi";
import { authApi } from "../authApi";
import { appendConversationId } from "../conversationApi/conversationApi";
import { type MessagePage, uniqueClientIds } from "@/lib/entities/messages";
import { ingestTyped } from "@/lib/marketplace/ingest";
import {
  updateMarketplaceConversation,
  marketplaceConversationSelectors,
} from "@/lib/slices/marketplaceData/slice";

const DEFAULT_PAGE_SIZE = 100;

/** `null` = first page (latest). Number = `beforeId` cursor for older pages. */
export type MessagesPageParam = number | null;

type GetMessagesArg = {
  conversationId: Conversation["id"];
  limit?: number;
};

type AppThunkDispatch = AppDispatch;

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
    if (message.id > 0 !== prev.id > 0) {
      merged.set(message.clientId, message.id > 0 ? message : prev);
      continue;
    }
    merged.set(message.clientId, message);
  }

  return [...merged.values()].sort((a, b) =>
    compareDateAsc(a.createdAt, b.createdAt),
  );
};

/** Build infinite-query pages from locally cached messages (ascending by time). */
export function buildLocalMessagePages(
  messages: ChatMessage[],
  pageSize = DEFAULT_PAGE_SIZE,
): { pages: MessagePage[]; pageParams: MessagesPageParam[] } {
  if (messages.length === 0) {
    return { pages: [], pageParams: [] };
  }

  const pages: MessagePage[] = [];
  let end = messages.length;
  const pageParams: MessagesPageParam[] = [];
  while (end > 0) {
    const start = Math.max(0, end - pageSize);
    const results = messages.slice(start, end);
    pages.push({
      clientIds: uniqueClientIds(results.map((m) => m.clientId)),
      nextBeforeId: results[0].id,
      hasMore: true,
    });
    pageParams.push(results[0].id);
    end = start;
  }

  return { pages, pageParams };
}

const MAX_ATTEMPTS = 3;
const MAX_DELAY = 1000 * 60 * 5;

const LAST_ATTEMPT_AT_TOO_OLD = 1000 * 60 * 1;

const getDelay = (attempts: number) => {
  return Math.min(MAX_DELAY, Math.pow(2, attempts) * 1000);
};

const handleSendMessage = async (
  data: OutboxItem,
  baseQuery: (
    arg: Parameters<
      BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
    >[0],
  ) => ReturnType<
    BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>
  >,
) => {
  const { conversationId, ...rest } = data;

  const response = await baseQuery({
    url: "/messages/send",
    method: "POST",
    body: {
      ...rest,
      ...(conversationId === -1 ? {} : { conversationId }),
    },
  });
  return response;
};

const createOptimisticMessage = (
  data: SendMessageInput & { clientId: string },
  currentUserId: number,
): ChatMessage & { memberUserIds?: number[] } => {
  return {
    id: -Date.now(),
    clientId: data.clientId,
    conversationId: data.conversationId,
    body: data.body,
    status: EMessageStatus.PENDING,
    sender: {
      id: currentUserId,
    },
    createdAt: new Date(),
    ...(data.memberUserIds ? { memberUserIds: data.memberUserIds } : {}),
  };
};

function usersFromMessages(messages: ChatMessage[]): PublicUser[] {
  const byId = new Map<number, PublicUser>();
  for (const message of messages) {
    const sender = message.sender;
    if (sender?.id == null) continue;
    if (sender.name == null) continue;
    byId.set(sender.id, {
      id: sender.id,
      name: sender.name,
      avatar: sender.avatar ?? null,
    });
  }
  return [...byId.values()];
}

export function ingestMessages(
  dispatch: AppThunkDispatch,
  messages: ChatMessage[],
) {
  if (messages.length === 0) return;
  ingestTyped(dispatch, "message", messages);
  const users = usersFromMessages(messages);
  if (users.length > 0) {
    ingestTyped(dispatch, "user", users);
  }
}

export function appendMessageClientId(
  dispatch: AppThunkDispatch,
  getState: () => unknown,
  conversationId: number,
  clientId: string,
) {
  const current = messageApi.endpoints.getMessages.select({ conversationId })(
    getState() as never,
  ).data;
  if (current) {
    dispatch(
      messageApi.util.updateQueryData(
        "getMessages",
        { conversationId },
        (draft) => {
          if (draft.pages.length === 0) {
            draft.pages.push({
              clientIds: [clientId],
              hasMore: false,
              nextBeforeId: null,
            });
            draft.pageParams.push(null);
            return;
          }
          const alreadyPresent = draft.pages.some((page) =>
            page.clientIds.includes(clientId),
          );
          if (!alreadyPresent) {
            draft.pages[0].clientIds.push(clientId);
          }
        },
      ),
    );
    return;
  }
  dispatch(
    messageApi.util.upsertQueryData(
      "getMessages",
      { conversationId },
      {
        pages: [
          {
            clientIds: [clientId],
            hasMore: false,
            nextBeforeId: null,
          },
        ],
        pageParams: [null],
      },
    ),
  );
}

export const messageApi = createApi({
  reducerPath: "messageApi",
  baseQuery: chatMarketplaceBaseQuery,
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
        const user = authApi.endpoints.getMe.select()(getState() as never);
        if (!user.data?.id) {
          throw new Error("Current user not found");
        }
        const db = getChatLocalDb(user.data?.id);
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

        ingestMessages(dispatch, [optimistic]);
        appendMessageClientId(dispatch, getState, conversationId, clientId);

        if (conversationId !== -1) {
          const conversation = marketplaceConversationSelectors.selectById(
            getState() as never,
            conversationId,
          );
          const meAsMember = conversation?.members.find(
            (member) => member.user.id === currentUserId,
          );
          dispatch(
            updateMarketplaceConversation({
              id: conversationId,
              changes: {
                lastMessageAt: optimistic.createdAt,
                lastMessagePreview: optimistic.body,
                lastMessageSender: {
                  user: {
                    id: currentUserId,
                    name: currentUser.data?.name ?? "",
                    avatar: currentUser.data?.avatar ?? null,
                  },
                  unread: meAsMember?.unread ?? 0,
                  mentionUnread: meAsMember?.mentionUnread ?? 0,
                  lastReadMessageId: meAsMember?.lastReadMessageId ?? 0,
                  lastReadAt: meAsMember?.lastReadAt ?? new Date(0),
                  lastReadMessageCreatedAt:
                    meAsMember?.lastReadMessageCreatedAt ?? new Date(0),
                },
              },
            }),
          );
        }

        await db.putMessages([optimistic]);
        await db.putOutbox(optimistic);
        try {
          let response = await handleSendMessage(optimistic, baseQuery);
          if (response.error) {
            const outboxItem = await db.outbox.get(optimistic.clientId);
            if (outboxItem) {
              outboxItem.attempts = (outboxItem.attempts ?? 0) + 1;
              outboxItem.lastAttemptAt = Date.now();
              await db.putOutbox(outboxItem);
            }
            response = await handleSendMessage(optimistic, baseQuery);
          }
          if (!response.error && response.data) {
            const payload = response.data as MessageResponse;
            if (payload.conversation) {
              appendConversationId(dispatch, getState, payload.conversation.id);
              await db.putConversation(payload.conversation);
            }
            if (payload.message) {
              ingestMessages(dispatch, [payload.message]);
              await db.putMessages([payload.message]);
            }
          }
          return response;
        } catch (error) {
          return { error };
        }
      },
    }),
    getMessages: builder.infiniteQuery<
      MessagePage,
      GetMessagesArg,
      MessagesPageParam
    >({
      infiniteQueryOptions: {
        initialPageParam: null,
        getNextPageParam: (lastPage) => {
          if (!lastPage.hasMore) return undefined;
          return lastPage.nextBeforeId ?? undefined;
        },
      },
      queryFn: async (
        { queryArg, pageParam },
        { dispatch, getState },
        _extraOptions,
        baseQuery,
      ) => {
        const { conversationId, limit = DEFAULT_PAGE_SIZE } = queryArg;
        const beforeId = pageParam ?? undefined;

        const user = authApi.endpoints.getMe.select()(getState() as never);
        if (!user.data?.id) {
          return {
            data: { clientIds: [], nextBeforeId: null, hasMore: false },
          };
        }
        const db = getChatLocalDb(user.data?.id);

        const response = await baseQuery({
          url: `/messages/${conversationId}`,
          params: {
            ...(beforeId != null ? { beforeId: beforeId.toString() } : {}),
            limit: limit.toString(),
          },
        });

        const data = response.data as MessageListResponse;
        if (data?.results?.length > 0) {
          await db.putMessages(data.results);

          let results = data.results;
          if (!beforeId) {
            const pendingMessages = await db.getPendingMessages();
            results = mergeMessages(pendingMessages, data.results);
            ingestMessages(dispatch, pendingMessages);
          }

          return {
            data: {
              clientIds: uniqueClientIds(results.map((m) => m.clientId)),
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
          ingestMessages(dispatch, local);
          return {
            data: {
              clientIds: uniqueClientIds(local.map((m) => m.clientId)),
              nextBeforeId: local[0].id,
              hasMore: true,
            },
          };
        }
        return {
          data: {
            clientIds: [],
            nextBeforeId: null,
            hasMore: false,
          },
        };
      },
      providesTags: ["Messages"],
    }),
    drainOutbox: builder.mutation<{ count: number }, void>({
      queryFn: async (_arg, { getState }, _extraOptions, baseQuery) => {
        const user = authApi.endpoints.getMe.select()(getState() as never);
        if (!user.data?.id) {
          return { data: { count: 0 } };
        }
        const db = getChatLocalDb(user.data?.id);
        const outbox = (await db.outbox.orderBy("createdAt").toArray()).map(
          (item) => ({ ...item, ...normalizeChatMessage(item) }),
        );
        let count = 0;
        for (const item of outbox) {
          let attempts = item.attempts ?? 0;
          let delay = getDelay(attempts);
          while (attempts < MAX_ATTEMPTS) {
            await new Promise((resolve) => setTimeout(resolve, delay));
            const response = await handleSendMessage(item, baseQuery);
            if (!response.error) {
              break;
            }
            attempts++;
            delay = getDelay(attempts);
          }
          if (attempts === MAX_ATTEMPTS) {
            console.log(
              "Failed to send message after " + MAX_ATTEMPTS + " attempts",
            );
            item.errorMessage =
              "Failed to send message after " + MAX_ATTEMPTS + " attempts";
            await db.putOutbox(item);
            if (
              item.lastAttemptAt &&
              Date.now() - item.lastAttemptAt > LAST_ATTEMPT_AT_TOO_OLD
            ) {
              console.log(
                "Deleting outbox and messages because last attempt was too old",
              );
              await db.outbox.delete(item.clientId);
              await db.messages.delete(item.clientId);
              break;
            }
          }

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
