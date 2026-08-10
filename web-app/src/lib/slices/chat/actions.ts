import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
import { setActiveConversation } from "./slice";

export const useSetActiveConversation = () => {
  const dispatch = useAppDispatch();
  return (conversationId: Conversation["id"]) => {
    dispatch(setActiveConversation(conversationId));
  };
};
