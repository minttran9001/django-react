import { useChatSocket } from "@/hooks/useChatSocket";
import { createContext, useContext } from "react";

const FORBIDDEN_MESSAGE = "useChatContext must be used within a ChatProvider";

const ChatContext = createContext<{
    sendTyping: (conversationId: number, typing: boolean) => void;
    sendSeen: (conversationId: number, lastReadMessageCreatedAt: Date) => void;
}>({
    sendTyping: () => {
        throw new Error(FORBIDDEN_MESSAGE);
    },
    sendSeen: () => {
        throw new Error(FORBIDDEN_MESSAGE);
    },
});

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
    const values = useChatSocket();
    return <ChatContext.Provider value={values}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
    return useContext(ChatContext);
};