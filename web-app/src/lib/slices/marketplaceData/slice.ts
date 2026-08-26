import { createSlice, current, type PayloadAction } from "@reduxjs/toolkit";

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
import type { ChatMessage } from "@/lib/types/message";
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
        asArray(unwrapped as Conversation),
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
        messagesAdapter.upsertMany(state.message, page);
      } else if (page && typeof page === "object" && "results" in page) {
        messagesAdapter.upsertMany(state.message, page.results ?? []);
      } else if (page && typeof page === "object" && "clientId" in page) {
        messagesAdapter.upsertOne(state.message, page as ChatMessage);
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
      conversationsAdapter.updateOne(state.conversation, action.payload);
    },
    updateMarketplaceConversationMember: (
      state,
      action: PayloadAction<{
        conversationId: number;
        memberId: number;
        lastReadMessageId: number;
        lastReadAt: string;
      }>,
    ) => {
      const conversation = marketplaceConversationSelectors.selectById(
        { marketplaceData: state },
        action.payload.conversationId,
      );
      if (!conversation) return;
      const member = conversation.members?.find(
        (m) => m.user.id === action.payload.memberId,
      );
      if (!member) return;
      if (action.payload.lastReadMessageId > member.lastReadMessageId) {
        member.lastReadMessageId = action.payload.lastReadMessageId;
        member.lastReadAt = action.payload.lastReadAt;
        conversationsAdapter.upsertOne(state.conversation, conversation);
      }
    },
  },
});

export const {
  addMarketplaceData,
  updateMarketplaceConversation,
  updateMarketplaceConversationMember,
} = marketplaceDataSlice.actions;
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
