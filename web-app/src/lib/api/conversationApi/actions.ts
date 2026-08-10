import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
import { conversationApi } from "./conversationApi";

export const useUpsertConversation = () => {
  const dispatch = useAppDispatch();
  return (conversation: Conversation) => {
    dispatch(
      conversationApi.util.updateQueryData(
        "getConversations",
        undefined,
        (draft) => {
          draft[conversation.id] = conversation;
        },
      ),
    );
  };
};
