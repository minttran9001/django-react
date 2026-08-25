"use client";

import { useAppDispatch } from "@/lib/hooks";
import {
  clearNewMessageOpen,
  setChatWidgetOpen,
  setNewMessageOpen,
} from "./slice";
import { ConversationMember } from "@/lib/types/conversation";

export const useSetChatWidgetOpen = () => {
  const dispatch = useAppDispatch();
  return (open: boolean) => dispatch(setChatWidgetOpen(open));
};

export const useSetNewMessageOpen = () => {
  const dispatch = useAppDispatch();
  return (userId: ConversationMember["user"]["id"], open: boolean) =>
    dispatch(setNewMessageOpen({ userId, open }));
};

export const useClearNewMessageOpen = () => {
  const dispatch = useAppDispatch();
  return () => dispatch(clearNewMessageOpen());
};
