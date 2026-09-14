import { createEntityAdapter, type EntityState } from "@reduxjs/toolkit";
import type { Conversation, PublicUser } from "@/lib/types/conversation";
import { compareDateDesc } from "@/lib/dates";

export const conversationsAdapter = createEntityAdapter<Conversation, number>({
  selectId: (conversation) => conversation.id,
  sortComparer: (a, b) => compareDateDesc(a.lastMessageAt, b.lastMessageAt),
});

export type ConversationsState = EntityState<Conversation, number>;

export const conversationsInitialState = conversationsAdapter.getInitialState();

export const conversationsSelectors = conversationsAdapter.getSelectors();

export function usersFromConversation(
  conversation: Conversation,
): PublicUser[] {
  const byId = new Map<number, PublicUser>();
  for (const member of conversation.members ?? []) {
    if (member?.user?.id != null) {
      byId.set(member.user.id, member.user);
    }
  }
  const sender = conversation.lastMessageSender?.user;
  if (sender?.id != null) {
    byId.set(sender.id, sender);
  }
  return [...byId.values()];
}

export function usersFromConversations(
  conversations: Conversation[],
): PublicUser[] {
  const byId = new Map<number, PublicUser>();
  for (const conversation of conversations) {
    for (const user of usersFromConversation(conversation)) {
      byId.set(user.id, user);
    }
  }
  return [...byId.values()];
}
