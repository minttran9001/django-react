import { useAppDispatch } from "@/lib/hooks";
import { setChatWidgetOpen } from "./slice";

export const useSetChatWidgetOpen = () => {
  const dispatch = useAppDispatch();
  return (open: boolean) => dispatch(setChatWidgetOpen(open));
};
