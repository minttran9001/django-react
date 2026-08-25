import { createEntityAdapter, type EntityState } from "@reduxjs/toolkit";
import type { ChatMessage } from "@/lib/types/message";

/** Messages are keyed by clientId (stable across optimistic → ack). */
export const messagesAdapter = createEntityAdapter<ChatMessage, string>({
  selectId: (message) => message.clientId,
  sortComparer: (a, b) => a.createdAt - b.createdAt,
});

export type MessagesState = EntityState<ChatMessage, string>;

export const messagesInitialState = messagesAdapter.getInitialState();

export type MessagePage = {
  clientIds: string[];
  hasMore: boolean;
  nextBeforeId: number | null;
};

export function resolveMessages(
  entities: MessagesState | undefined,
  clientIds: string[],
): ChatMessage[] {
  if (!entities) return [];
  return clientIds
    .map((id) => entities.entities[id])
    .filter((message): message is ChatMessage => message != null);
}

export const messagesSelectors = messagesAdapter.getSelectors();

export function selectMessagesByConversationId(
  entities: MessagesState | undefined,
  conversationId: number,
): ChatMessage[] {
  if (!entities) return [];
  return messagesSelectors
    .selectAll(entities)
    .filter((message) => message.conversationId === conversationId);
}

export function selectMessagesForPages(
  entities: MessagesState | undefined,
  pages: MessagePage[] | undefined,
): ChatMessage[] {
  if (!pages?.length) return [];
  return pages.reduceRight<ChatMessage[]>((acc, page) => {
    acc.push(...resolveMessages(entities, page.clientIds));
    return acc;
  }, []);
}

export const DRAFT_CONVERSATION_ID = -1;
