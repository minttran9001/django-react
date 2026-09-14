import {
  createEntityAdapter,
  createSelector,
  type EntityState,
} from "@reduxjs/toolkit";
import type { ChatMessage } from "@/lib/types/message";
import { compareDateAsc } from "@/lib/dates";

/** Messages are keyed by clientId (stable across optimistic → ack). */
export const messagesAdapter = createEntityAdapter<ChatMessage, string>({
  selectId: (message) => message.clientId,
  sortComparer: (a, b) => compareDateAsc(a.createdAt, b.createdAt),
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

export function uniqueClientIds(clientIds: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const clientId of clientIds) {
    if (seen.has(clientId)) continue;
    seen.add(clientId);
    result.push(clientId);
  }
  return result;
}

const EMPTY_PAGE_MESSAGES: ChatMessage[] = [];

export const selectMessagesForPages = createSelector(
  [
    (entities: MessagesState | undefined) => entities,
    (_entities: MessagesState | undefined, pages: MessagePage[] | undefined) =>
      pages,
  ],
  (entities, pages): ChatMessage[] => {
    if (!pages?.length) return EMPTY_PAGE_MESSAGES;
    const seen = new Set<string>();
    return pages.reduceRight<ChatMessage[]>((acc, page) => {
      for (const message of resolveMessages(entities, page.clientIds)) {
        if (seen.has(message.clientId)) continue;
        seen.add(message.clientId);
        acc.push(message);
      }
      return acc;
    }, []);
  },
);

export const DRAFT_CONVERSATION_ID = -1;
