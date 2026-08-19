import { useAppDispatch } from "@/lib/hooks";
import { Conversation } from "@/lib/types/conversation";
import {
  clearDraftMessage,
  setActiveConversation,
  setDraftMessage,
  setTyping,
  clearTyping,
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

export const useSetTyping = () => {
  const dispatch = useAppDispatch();
  return (
    conversationId: Conversation["id"],
    userId: number,
    typing?: boolean,
  ) => {
    dispatch(setTyping({ conversationId, userId, typing }));
  };
};

export const useClearTyping = () => {
  const dispatch = useAppDispatch();
  return (conversationId: Conversation["id"], userId: number) => {
    dispatch(clearTyping({ conversationId, userId }));
  };
};
