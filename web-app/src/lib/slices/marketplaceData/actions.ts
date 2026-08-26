"use client";

import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import type { Conversation } from "@/lib/types/conversation";
import type { Transaction } from "@/lib/types/transaction";
import type { MessagePage } from "@/lib/entities/messages";
import { selectMessagesForPages } from "@/lib/entities/messages";
import {
  addMarketplaceData,
  marketplaceConversationSelectors,
  marketplaceCourtCenterSelectors,
  marketplaceTransactionSelectors,
  marketplaceUserSelectors,
} from "./slice";

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
  return useAppSelector((state): Conversation[] => {
    if (!ids?.length) return [];
    return ids
      .map((id) => marketplaceConversationSelectors.selectById(state, id))
      .filter(
        (conversation): conversation is Conversation => conversation != null,
      )
      .sort((a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0));
  });
};

export const useMarketplaceMessagesForPages = (
  pages: MessagePage[] | undefined,
) => {
  return useAppSelector((state) =>
    selectMessagesForPages(state.marketplaceData.message, pages).sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ),
  );
};
