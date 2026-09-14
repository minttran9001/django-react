import { ImageResource } from "@/features/court-centers/types";
import { asDate } from "@/lib/dates";
import { Conversation } from "./conversation";

export enum EMessageStatus {
  PENDING = "pending",
  SENT = "sent",
  ACKED = "acked",
  FAILED = "failed",
}

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
  id: number;
  clientId: string;
  conversationId: Conversation["id"];
  body: string;
  createdAt: Date;
  status: EMessageStatus;
  sender: {
    id: number;
    name?: string;
    avatar?: ImageResource | null;
  };
}

export interface OutboxItem extends ChatMessage {
  lastAttemptAt?: number;
  attempts?: number;
  errorMessage?: string;
}

export interface SendMessageInput {
  conversationId: Conversation["id"];
  body: string;
  memberUserIds?: number[];
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

export function normalizeChatMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    createdAt: asDate(message.createdAt),
  };
}
