"use client";

import { useAppSelector } from "@/lib/hooks";

export const useChatWidgetOpen = () => {
  return useAppSelector((state) => state.ui.chatWidgetOpen);
};

export const useNewMessageOpen = () => {
  return useAppSelector((state) => state.ui.newMessageOpen);
};
