"use client";
import ChatLauncher from "./ChatLauncher";
import YourMessages from "./YourMessages";
import { useChatWidgetOpen } from "@/lib/slices/ui/selectors";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChatProvider } from "@/providers/ChatContext";
const ChatWidget = () => {
    const auth = useAuth();

    if (!auth.isAuthenticated) {
        return null;
    }

    return (
        <ChatProvider>
            <ChatLauncher />
            <ChatWidgetWrapper>
                <YourMessages />
            </ChatWidgetWrapper>
        </ChatProvider>
    );
};

export const ChatWidgetWrapper = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const chatWidgetOpen = useChatWidgetOpen();
    return chatWidgetOpen ? children : null;
};

export default ChatWidget;
