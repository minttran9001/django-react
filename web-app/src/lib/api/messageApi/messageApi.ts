import { env } from "@/lib/env";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { SendMessageInput } from "@/lib/types/message";
import { MessageListResponse, MessageResponse } from "@/lib/types/message";
import { Conversation } from "@/lib/types/conversation";

const DEFAULT_PAGE_SIZE = 40;

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
      queryFn: async (data, _api, _extraOptions, baseQuery) => {
        try {
          const clientId = crypto.randomUUID();
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
    getMessages: builder.query<
      MessageListResponse,
      {
        conversationId: Conversation["id"];
        beforeId?: number;
        afterId?: number;
        limit?: number;
      }
    >({
      query: ({ conversationId, beforeId, limit = DEFAULT_PAGE_SIZE }) => ({
        url: `/messages/${conversationId}`,
        params: {
          ...(beforeId ? { beforeId: beforeId.toString() } : {}),
          limit: limit.toString(),
        },
      }),
      // merge pages for infinite scroll
      serializeQueryArgs: ({ queryArgs, endpointName }) => {
        return `${endpointName}-${queryArgs.conversationId}`;
      },
      merge: (currentCache, newItems, { arg }) => {
        if (!arg.beforeId) return newItems;
        return {
          ...newItems,
          results: [...currentCache.results, ...newItems.results],
        };
      },
      providesTags: ["Messages"],
    }),
  }),
});

export const { useSendMessageMutation, useGetMessagesQuery } = messageApi;
