import type {
  AuthUser,
  Image,
  Member,
  UserProfile,
} from "../generated/prisma/client";
import { idNum, requireId } from "../common/utils/ids";
import {
  RESOURCE_CONVERSATION,
  RESOURCE_MESSAGE,
  RESOURCE_USER,
  typedResource,
} from "../common/typed-resource";

type ProfileWithAvatar = UserProfile & { avatar: Image | null };
type UserWithProfile = AuthUser & { profile: ProfileWithAvatar | null };
export type MemberWithUser = Member & {
  user: UserWithProfile;
};

export function formatAvatar(avatar: Image | null | undefined) {
  if (!avatar) return null;
  return {
    id: requireId(avatar.id),
    url: avatar.url,
    publicId: avatar.publicId,
  };
}

export function formatPublicUser(user: UserWithProfile) {
  const profile = user.profile;
  return typedResource(RESOURCE_USER, {
    id: requireId(user.id),
    name: profile?.name ?? "",
    avatar: formatAvatar(profile?.avatar ?? null),
  });
}

export function formatMember(member: MemberWithUser) {
  return {
    user: formatPublicUser(member.user),
    unread: member.unread,
    mentionUnread: member.mentionUnread,
    lastReadMessageId: idNum(member.lastReadMessageId),
    lastReadAt: member.lastReadAt?.toISOString() ?? null,
    lastReadMessageCreatedAt:
      member.lastReadMessageCreatedAt?.toISOString() ?? null,
  };
}

export function formatConversation(conversation: {
  id: bigint;
  type: string;
  name: string | null;
  lastMessageAt: Date | null;
  lastMessageContent: string | null;
  unread?: number;
  mentionUnread?: number;
  members: MemberWithUser[];
  lastMessageSender: MemberWithUser | null;
}) {
  return typedResource(RESOURCE_CONVERSATION, {
    id: requireId(conversation.id),
    name: conversation.name,
    type: conversation.type,
    unread: conversation.unread ?? 0,
    mentionUnread: conversation.mentionUnread ?? 0,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conversation.lastMessageContent,
    lastMessageSender: conversation.lastMessageSender
      ? formatMember(conversation.lastMessageSender)
      : null,
    members: conversation.members.map(formatMember),
  });
}

export function formatMessage(message: {
  id: bigint;
  clientId: string | null;
  conversationId: bigint;
  body: string | null;
  status: string;
  createdAt: Date;
  sender: UserWithProfile;
}) {
  return {
    id: requireId(message.id),
    clientId: message.clientId,
    conversationId: requireId(message.conversationId),
    body: message.body,
    status: message.status,
    createdAt: message.createdAt.toISOString(),
    sender: formatPublicUser(message.sender),
  };
}

export function formatMessageResource(
  message: Parameters<typeof formatMessage>[0],
) {
  // Must match list/WS shape: HTTP send ACK is ingested over the optimistic
  // row and written to IndexedDB. Omitting sender/conversationId wipes those
  // fields and crashes MessageList on message.sender.id.
  return typedResource(RESOURCE_MESSAGE, formatMessage(message));
}

export function formatMessageListEnvelope(data: {
  results: ReturnType<typeof formatMessage>[];
  hasMore: boolean;
  nextBeforeId: number | null;
}) {
  return typedResource(RESOURCE_MESSAGE, data);
}
