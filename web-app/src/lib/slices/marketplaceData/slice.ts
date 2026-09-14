import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CourtCenter } from "@/features/court-centers/types";
import {
  conversationsAdapter,
  conversationsInitialState,
} from "@/lib/entities/conversations";
import {
  courtCentersAdapter,
  courtCentersInitialState,
} from "@/lib/entities/courtCenters";
import { messagesAdapter, messagesInitialState } from "@/lib/entities/messages";
import { usersAdapter, usersInitialState } from "@/lib/entities/users";
import {
  collectTypedResources,
  unwrapDeep,
  type MarketplaceType,
  type TypedResource,
} from "@/lib/marketplace/typedResource";
import type { Conversation, PublicUser } from "@/lib/types/conversation";
import {
  normalizeConversation,
  normalizeConversationMember,
} from "@/lib/types/conversation";
import type { ChatMessage } from "@/lib/types/message";
import { normalizeChatMessage } from "@/lib/types/message";
import { asDate, laterDate } from "@/lib/dates";
import { transactionsAdapter } from "@/lib/entities/transaction";
import { transactionsInitialState } from "@/lib/entities/transaction";
import { Transaction } from "@/lib/types/transaction";

type MarketplaceState = {
  user: ReturnType<typeof usersAdapter.getInitialState>;
  conversation: ReturnType<typeof conversationsAdapter.getInitialState>;
  courtCenter: ReturnType<typeof courtCentersAdapter.getInitialState>;
  message: ReturnType<typeof messagesAdapter.getInitialState>;
  transaction: ReturnType<typeof transactionsAdapter.getInitialState>;
};

const initialState: MarketplaceState = {
  user: usersInitialState,
  conversation: conversationsInitialState,
  courtCenter: courtCentersInitialState,
  message: messagesInitialState,
  transaction: transactionsInitialState,
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function mergeConversationMembers(
  existing: Conversation["members"] | undefined,
  incoming: Conversation["members"] | undefined,
): Conversation["members"] {
  if (!incoming?.length) return incoming ?? existing ?? [];
  if (!existing?.length) return incoming;
  const prevByUserId = new Map(
    existing.map((member) => [member.user.id, member]),
  );
  return incoming.map((member) => {
    const prev = prevByUserId.get(member.user.id);
    if (!prev) return member;
    const lastReadAt = laterDate(prev.lastReadAt, member.lastReadAt);
    const lastReadMessageCreatedAt = laterDate(
      prev.lastReadMessageCreatedAt,
      member.lastReadMessageCreatedAt,
    );
    return {
      ...member,
      lastReadMessageId: Math.max(
        prev.lastReadMessageId ?? 0,
        member.lastReadMessageId ?? 0,
      ),
      lastReadAt,
      lastReadMessageCreatedAt,
    };
  });
}

function mergeIncomingMessages(
  state: MarketplaceState,
  incoming: ChatMessage[],
): ChatMessage[] {
  return incoming.map((message) => {
    const existing = state.message.entities[message.clientId];
    if (!existing) return message;
    return {
      ...message,
      id: message.id > 0 ? message.id : existing.id,
      createdAt: existing.createdAt,
    };
  });
}

function upsertByType(
  state: MarketplaceState,
  type: MarketplaceType,
  data: unknown,
) {
  const unwrapped = unwrapDeep(data);
  switch (type) {
    case "user":
      usersAdapter.upsertMany(state.user, asArray(unwrapped as PublicUser));
      break;
    case "conversation":
      conversationsAdapter.upsertMany(
        state.conversation,
        asArray(unwrapped as Conversation).map((conversation) => {
          const incoming = normalizeConversation(conversation);
          const existing = state.conversation.entities[incoming.id];
          if (!existing) return incoming;
          return {
            ...incoming,
            members: mergeConversationMembers(
              existing.members,
              incoming.members,
            ),
          };
        }),
      );
      break;
    case "courtCenter":
      courtCentersAdapter.upsertMany(
        state.courtCenter,
        asArray(unwrapped as CourtCenter),
      );
      break;
    case "message": {
      const page = unwrapped as
        | ChatMessage
        | ChatMessage[]
        | { results?: ChatMessage[] };
      if (Array.isArray(page)) {
        messagesAdapter.upsertMany(
          state.message,
          mergeIncomingMessages(state, page.map(normalizeChatMessage)),
        );
      } else if (page && typeof page === "object" && "results" in page) {
        messagesAdapter.upsertMany(
          state.message,
          mergeIncomingMessages(
            state,
            (page.results ?? []).map(normalizeChatMessage),
          ),
        );
      } else if (page && typeof page === "object" && "clientId" in page) {
        messagesAdapter.upsertOne(
          state.message,
          mergeIncomingMessages(state, [
            normalizeChatMessage(page as ChatMessage),
          ])[0],
        );
      }
      break;
    }
    case "transaction":
      transactionsAdapter.upsertMany(
        state.transaction,
        asArray(unwrapped as Transaction),
      );
      break;
    default:
      break;
  }
}

const marketplaceDataSlice = createSlice({
  name: "marketplaceData",
  initialState,
  reducers: {
    addMarketplaceData: (state, action: PayloadAction<unknown>) => {
      const payload = action.payload;
      if (payload == null) return;
      const resources: TypedResource[] = collectTypedResources(payload);
      for (const resource of resources) {
        upsertByType(state, resource.type, resource.data);
      }
    },
    updateMarketplaceConversation: (
      state,
      action: PayloadAction<{
        id: number;
        changes: Partial<Conversation>;
      }>,
    ) => {
      const { id, changes } = action.payload;
      conversationsAdapter.updateOne(state.conversation, {
        id,
        changes: {
          ...changes,
          ...(changes.lastMessageAt
            ? { lastMessageAt: asDate(changes.lastMessageAt) }
            : {}),
          ...(changes.lastMessageSender
            ? {
                lastMessageSender: normalizeConversationMember(
                  changes.lastMessageSender,
                ),
              }
            : {}),
          ...(changes.members
            ? { members: changes.members.map(normalizeConversationMember) }
            : {}),
        },
      });
    },
  },
});

export const { addMarketplaceData, updateMarketplaceConversation } =
  marketplaceDataSlice.actions;
export default marketplaceDataSlice.reducer;

export type { MarketplaceState };

export const marketplaceUserSelectors = usersAdapter.getSelectors(
  (state: { marketplaceData: MarketplaceState }) => state.marketplaceData.user,
);
export const marketplaceConversationSelectors =
  conversationsAdapter.getSelectors(
    (state: { marketplaceData: MarketplaceState }) =>
      state.marketplaceData.conversation,
  );
export const marketplaceCourtCenterSelectors = courtCentersAdapter.getSelectors(
  (state: { marketplaceData: MarketplaceState }) =>
    state.marketplaceData.courtCenter,
);
export const marketplaceMessageSelectors = messagesAdapter.getSelectors(
  (state: { marketplaceData: MarketplaceState }) =>
    state.marketplaceData.message,
);
export const marketplaceTransactionSelectors = transactionsAdapter.getSelectors(
  (state: { marketplaceData: MarketplaceState }) =>
    state.marketplaceData.transaction,
);
