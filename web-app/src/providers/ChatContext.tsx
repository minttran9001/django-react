import { useChatSocket } from "@/hooks/useChatSocket";
import { createContext, useContext } from "react";

const ChatContext = createContext<{
    sendTyping: (conversationId: number, typing: boolean) => void;
}>({
    sendTyping: () => {
        throw new Error("useChatContext must be used within a ChatProvider");
    },
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const { sendTyping } = useChatSocket();
    return <ChatContext.Provider value={{ sendTyping }}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
    return useContext(ChatContext);
};