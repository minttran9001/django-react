"use client";

import { useStore } from "react-redux";
import { useAppDispatch } from "@/lib/hooks";
import type { RootState } from "@/lib/store";
import { Conversation } from "@/lib/types/conversation";
import { upsertConversationInCache } from "./conversationApi";

export const useUpsertConversation = () => {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  return (conversation: Conversation) => {
    upsertConversationInCache(dispatch, store.getState, conversation);
  };
};
