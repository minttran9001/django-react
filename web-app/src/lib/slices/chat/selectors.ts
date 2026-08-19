import { useAppSelector } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";

export const useActiveConversationId = () => {
  return useAppSelector((state) => state.chat.activeId);
};

export const useDraftMessage = (conversationId: Conversation["id"]) => {
  return useAppSelector(
    (state) => state.chat.draftMessageByConversationId[conversationId],
  );
};

export const useTyping = (conversationId: Conversation["id"]) => {
  return useAppSelector(
    (state) => state.chat.typingByConversationId[conversationId] ?? {},
  );
};
