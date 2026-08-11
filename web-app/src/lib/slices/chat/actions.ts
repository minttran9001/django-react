import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
import {
  clearDraftMessage,
  setActiveConversation,
  setDraftMessage,
} from "./slice";

export const useSetActiveConversation = () => {
  const dispatch = useAppDispatch();
  return (conversationId: Conversation["id"] | null) => {
    dispatch(setActiveConversation(conversationId));
  };
};

export const useSetDraftMessage = () => {
  const dispatch = useAppDispatch();
  return (conversationId: Conversation["id"], draftMessage: string) => {
    dispatch(setDraftMessage({ conversationId, draftMessage }));
  };
};

export const useClearDraftMessage = () => {
  const dispatch = useAppDispatch();
  return (conversationId: Conversation["id"]) => {
    dispatch(clearDraftMessage({ conversationId }));
  };
};
