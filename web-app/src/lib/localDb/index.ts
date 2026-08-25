import Dexie, { Table } from "dexie";
import { Conversation } from "../types/conversation";
import { ChatMessage, EMessageStatus, OutboxItem } from "../types/message";

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

  getMessagesByConversationId(
    conversationId: Conversation["id"],
  ): Promise<ChatMessage[]> {
    return this.messages
      .where("conversationId")
      .equals(conversationId)
      .toArray()
      .then((messages) =>
        messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
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
      .then((messages) =>
        messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
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
        messages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
  }

  getConversations(): Promise<Conversation[]> {
    return this.conversations.toArray();
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

export const getChatLocalDb = (currentUserId?: number) => {
  console.log({ currentUserId });
  if (chatLocalDb && chatLocalDbByUserId !== currentUserId) {
    chatLocalDb.close();
    chatLocalDb = null;
  }

  if (!chatLocalDb) {
    chatLocalDb = new LocalDb(`${currentUserId}-chat-db`);
    chatLocalDbByUserId = currentUserId;
  }

  return chatLocalDb;
};

export const closeChatLocalDb = () => {
  if (chatLocalDb) {
    chatLocalDb.close();
    chatLocalDb = null;
    chatLocalDbByUserId = null;
  }
};
