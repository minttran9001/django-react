import Dexie, { Table } from "dexie";
import { Conversation } from "../types/conversation";
import { ChatMessage, OutboxItem } from "../types/message";

export type ConversationMetadata = {
  conversationId: Conversation["id"];
  nextBeforeId: number | null;
  hasMore: boolean;
};

export class LocalDb extends Dexie {
  conversations!: Table<Conversation>;
  messages!: Table<ChatMessage>;
  outbox!: Table<OutboxItem>;
  conversationMetadata!: Table<ConversationMetadata>;
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
  }

  getMessagesByConversationId(
    conversationId: Conversation["id"],
  ): Promise<ChatMessage[]> {
    return this.messages
      .where("conversationId")
      .equals(conversationId)
      .toArray()
      .then((messages) => messages.sort((a, b) => a.createdAt - b.createdAt));
  }
  getConversations(): Promise<Conversation[]> {
    return this.conversations.toArray();
  }

  getConversationMetadata(
    conversationId: Conversation["id"],
  ): Promise<ConversationMetadata | undefined> {
    return this.conversationMetadata.get(conversationId);
  }

  setConversationMetadata(metadata: ConversationMetadata): Promise<void> {
    return this.conversationMetadata.put({
      ...metadata,
    });
  }
}

let chatLocalDb: LocalDb | null = null;

export const getChatLocalDb = () => {
  if (!chatLocalDb) {
    chatLocalDb = new LocalDb("chat-db");
  }
  return chatLocalDb;
};
