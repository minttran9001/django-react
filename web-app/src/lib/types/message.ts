import { ImageResource } from "@/features/court-centers/types";
import { Conversation } from "./conversation";

export type MessageStatus = "pending" | "sent" | "acked" | "failed";

export interface MessageAttachment {
  name: string;
  mime: string;
  size: number;
  attachmentId: string;
  /** Present after local encrypt; needed to decrypt download */
  fileIv?: string;
  fileKey?: string;
}

export interface ChatMessage {
  id: string;
  clientId: string;
  conversationId: string;
  body: string;
  createdAt: number;
  status: MessageStatus;
  sender: {
    id: number;
    name: string;
    avatar: ImageResource | null;
  };
}

export interface OutboxItem {
  id: string;
  clientId: string;
  conversationId: string;
  toJid: string;
  body: string;
  /** Encrypted wire payload; if set, XMPP sends this instead of body */
  wireBody?: string;
  createdAt: number;
  attempts: number;
  lastAttemptAt?: number;
  error?: string;
}

export interface SendMessageInput {
  conversationId: Conversation["id"];
  body: string;
  memberUserIds?: string[];
  name?: string;
}

export interface MessageResponse {
  conversation: Conversation;
  message: ChatMessage;
  conversationCreated: boolean;
}

export interface MessageListResponse {
  results: ChatMessage[];
  hasMore: boolean;
  nextBeforeId: number | null;
}
