"use client";

import { createSelector } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import type { Conversation } from "@/lib/types/conversation";
import type { MessagePage } from "@/lib/entities/messages";
import { conversationsSelectors } from "@/lib/entities/conversations";
import { selectMessagesForPages } from "@/lib/entities/messages";
import { compareDateDesc } from "@/lib/dates";
import {
  addMarketplaceData,
  marketplaceConversationSelectors,
  marketplaceCourtCenterSelectors,
  marketplaceTransactionSelectors,
  marketplaceUserSelectors,
  type MarketplaceState,
} from "./slice";

const EMPTY_INBOX: Conversation[] = [];

const selectInboxConversations = createSelector(
  [
    (state: { marketplaceData: MarketplaceState }) =>
      state.marketplaceData.conversation,
    (_state: { marketplaceData: MarketplaceState }, ids: number[] | undefined) =>
      ids,
  ],
  (conversationState, ids): Conversation[] => {
    if (!ids?.length) return EMPTY_INBOX;
    const conversations: Conversation[] = [];
    for (const id of ids) {
      const conversation = conversationsSelectors.selectById(
        conversationState,
        id,
      );
      if (conversation) conversations.push(conversation);
    }
    conversations.sort((a, b) =>
      compareDateDesc(a.lastMessageAt, b.lastMessageAt),
    );
    return conversations;
  },
);

export const useAddMarketplaceData = () => {
  const dispatch = useAppDispatch();
  return (payload: unknown) => dispatch(addMarketplaceData(payload));
};

export const useMarketplaceUser = (userId: number | null | undefined) => {
  return useAppSelector((state) =>
    userId ? marketplaceUserSelectors.selectById(state, userId) : undefined,
  );
};

export const useMarketplaceConversation = (
  conversationId: number | null | undefined,
) => {
  return useAppSelector((state) =>
    conversationId
      ? marketplaceConversationSelectors.selectById(state, conversationId)
      : undefined,
  );
};

export const useMarketplaceCourtCenter = (
  courtCenterId: number | null | undefined,
) => {
  return useAppSelector((state) =>
    courtCenterId
      ? marketplaceCourtCenterSelectors.selectById(state, courtCenterId)
      : undefined,
  );
};

export const useMarketplaceTransaction = (
  transactionId: number | null | undefined,
) => {
  return useAppSelector((state) =>
    transactionId
      ? marketplaceTransactionSelectors.selectById(state, transactionId)
      : undefined,
  );
};

export const useInboxConversations = (ids: number[] | undefined) => {
  return useAppSelector((state) => selectInboxConversations(state, ids));
};

export const useMarketplaceMessagesForPages = (
  pages: MessagePage[] | undefined,
) => {
  const resolvedMessages = useAppSelector((state) =>
    selectMessagesForPages(state.marketplaceData.message, pages),
  );
  return resolvedMessages;
};
