"use client";
import ChatLauncher from "./ChatLauncher";
import YourMessages from "./YourMessages";
import { useChatWidgetOpen, useNewMessageOpen } from "@/lib/slices/ui/selectors";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChatProvider } from "@/providers/ChatContext";
import NewMessage from "./NewMessage";

const ChatWidget = () => {
    const auth = useAuth();

    if (!auth.isAuthenticated) {
        return null;
    }

    return (
        <ChatProvider>
            <ChatLauncher />
            <ChatWidgetPanel />
        </ChatProvider>
    );
};

const ChatWidgetPanel = () => {
    const chatWidgetOpen = useChatWidgetOpen();
    const newMessageOpen = useNewMessageOpen();
    if (!chatWidgetOpen) {
        return null;
    }

    return newMessageOpen && Object.keys(newMessageOpen).length > 0 ? <NewMessage /> : <YourMessages />;
};

export default ChatWidget;
