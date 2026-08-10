import { useAppSelector } from "@/lib/hooks";

export const useActiveConversationId = () => {
  return useAppSelector((state) => state.chat.activeId);
};
