import { ImageResource } from "@/features/court-centers/types";
import { asDate } from "@/lib/dates";

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
  lastReadMessageId: number;
  lastReadMessageCreatedAt: Date;
  lastReadAt: Date;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  name: string;
  unread: number;
  mentionUnread: number;
  lastMessageAt: Date;
  lastMessagePreview: string;
  lastMessageSender: ConversationMember;
  members: ConversationMember[];
}

export function normalizeConversationMember(
  member: ConversationMember,
): ConversationMember {
  return {
    ...member,
    lastReadAt: asDate(member.lastReadAt),
    lastReadMessageCreatedAt: asDate(member.lastReadMessageCreatedAt),
  };
}

export function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    lastMessageAt: asDate(conversation.lastMessageAt),
    lastMessageSender: conversation.lastMessageSender
      ? normalizeConversationMember(conversation.lastMessageSender)
      : conversation.lastMessageSender,
    members: (conversation.members ?? []).map(normalizeConversationMember),
  };
}
