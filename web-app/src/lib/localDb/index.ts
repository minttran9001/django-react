import Dexie, { Table } from "dexie";
import { Conversation, normalizeConversation } from "../types/conversation";
import {
  ChatMessage,
  EMessageStatus,
  OutboxItem,
  normalizeChatMessage,
} from "../types/message";
import { compareDateAsc, compareDateDesc } from "../dates";

export class LocalDb extends Dexie {
  conversations!: Table<Conversation>;
  messages!: Table<ChatMessage>;
  outbox!: Table<OutboxItem>;
  constructor(dbName: string) {
    super(dbName);
    this.version(1).stores({
      conversations:
        "++id, type, name, unread, mentionUnread, lastMessageAt, lastMessagePreview, lastMessageSender, members",
      messages:
        "++id, clientId, conversationId, body, status, sender, createdAt",
    });
    this.version(2).stores({
      conversationMetadata: "conversationId, nextBeforeId, hasMore",
    });
    this.version(3).stores({
      outbox:
        "id, clientId, conversationId, body, status, sender, createdAt, lastAttemptAt, attempts, errorMessage",
    });
    this.version(4).stores({
      conversations:
        "++id, type, name, unread, mentionUnread, lastMessageAt, lastMessagePreview, lastMessageSender, members",
      messages:
        "++id, clientId, conversationId, body, status, sender, createdAt",
      outbox:
        "id, clientId, conversationId, body, status, sender, createdAt, lastAttemptAt, attempts, errorMessage",
    });
  }

  async putConversation(conversation: Conversation): Promise<void> {
    await this.conversations.put(normalizeConversation(conversation));
  }

  async putConversations(conversations: Conversation[]): Promise<void> {
    if (conversations.length === 0) return;
    await this.conversations.bulkPut(conversations.map(normalizeConversation));
  }

  getMessagesByConversationId(
    conversationId: Conversation["id"],
  ): Promise<ChatMessage[]> {
    return this.messages
      .where("conversationId")
      .equals(conversationId)
      .toArray()
      .then((messages) =>
        messages
          .map(normalizeChatMessage)
          .sort((a, b) => compareDateAsc(a.createdAt, b.createdAt)),
      );
  }

  async putMessages(messages: ChatMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const normalized = messages.map(normalizeChatMessage);
    const clientIds = [
      ...new Set(normalized.map((message) => message.clientId)),
    ];
    await this.messages.where("clientId").anyOf(clientIds).delete();
    await this.messages.bulkPut(normalized);
  }

  async getMessagesByConversationIdAndPage(
    conversationId: Conversation["id"],
    beforeId?: number,
    limit?: number,
  ): Promise<ChatMessage[]> {
    let messages = await this.messages
      .where("conversationId")
      .equals(conversationId)
      .toArray()
      .then((rows) =>
        rows
          .map(normalizeChatMessage)
          .sort((a, b) => compareDateAsc(a.createdAt, b.createdAt)),
      );
    const byClientId = new Map<string, ChatMessage>();
    for (const message of messages) {
      const prev = byClientId.get(message.clientId);
      if (!prev) {
        byClientId.set(message.clientId, message);
        continue;
      }
      const preferPositiveId = message.id > 0 !== prev.id > 0;
      byClientId.set(
        message.clientId,
        preferPositiveId
          ? message.id > 0
            ? message
            : prev
          : message.id >= prev.id
            ? message
            : prev,
      );
    }
    messages = [...byClientId.values()].sort((a, b) =>
      compareDateAsc(a.createdAt, b.createdAt),
    );
    if (beforeId) {
      messages = messages.filter((message) => message.id < beforeId);
    }
    messages = messages.slice(-(limit ?? 40));
    return messages;
  }

  getPendingMessages(): Promise<OutboxItem[]> {
    return this.messages
      .where("status")
      .equals(EMessageStatus.PENDING)
      .toArray()
      .then((messages) =>
        messages
          .map((message) => normalizeChatMessage(message) as OutboxItem)
          .sort((a, b) => compareDateAsc(a.createdAt, b.createdAt)),
      );
  }

  getConversations(): Promise<Conversation[]> {
    return this.conversations
      .toArray()
      .then((conversations) =>
        conversations
          .map(normalizeConversation)
          .sort((a, b) => compareDateDesc(a.lastMessageAt, b.lastMessageAt)),
      );
  }

  async putOutbox(item: OutboxItem): Promise<void> {
    await this.outbox.put({
      ...item,
      ...normalizeChatMessage(item),
    });
  }

  deleteOutboxByClientId(clientId?: string) {
    if (!clientId) {
      return Promise.resolve();
    }
    return this.outbox.where("clientId").equals(clientId).delete();
  }
}

let chatLocalDb: LocalDb | null = null;
let chatLocalDbByUserId: number | undefined | null = null;

export function getChatLocalDb(currentUserId: number): LocalDb;
export function getChatLocalDb(currentUserId?: number): LocalDb | null;
export function getChatLocalDb(currentUserId?: number): LocalDb | null {
  if (!currentUserId) {
    return null;
  }

  if (chatLocalDb && chatLocalDbByUserId !== currentUserId) {
    chatLocalDb.close();
    chatLocalDb = null;
  }

  if (!chatLocalDb) {
    chatLocalDb = new LocalDb(`${currentUserId}-chat-db`);
    chatLocalDbByUserId = currentUserId;
  }

  return chatLocalDb;
}

export const closeChatLocalDb = () => {
  if (chatLocalDb) {
    chatLocalDb.close();
    chatLocalDb = null;
    chatLocalDbByUserId = null;
  }
};
