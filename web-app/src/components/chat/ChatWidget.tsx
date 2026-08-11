"use client";
import ChatLauncher from "./ChatLauncher";
import YourMessages from "./YourMessages";
import { useChatWidgetOpen } from "@/lib/slices/ui/selectors";
import { useAuth } from "@/lib/hooks/useAuth";
const ChatWidget = () => {
    const auth = useAuth();

    if (!auth.isAuthenticated) {
        return null;
    }

    return (
        <>
            <ChatLauncher />
            <ChatWidgetWrapper>
                <YourMessages />
            </ChatWidgetWrapper>
        </>
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
