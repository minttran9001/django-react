import { ImageResource } from "@/features/court-centers/types";

export type ConversationType = "dm" | "muc";

export interface PublicUser {
  id: number;
  name: string;
  avatar: ImageResource | null;
}

export interface ConversationMember {
  user: PublicUser;
  unread: number;
  mentionUnread: number;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  unread: number;
  mentionUnread: number;
  lastMessageAt: number;
  lastMessagePreview: string;
  lastMessageSender: ConversationMember;
  members: ConversationMember[];
}
