import { useAppSelector } from "@/lib/hooks";

export const useChatWidgetOpen = () => {
  return useAppSelector((state) => state.ui.chatWidgetOpen);
};
