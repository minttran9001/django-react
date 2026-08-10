import React from 'react'
import { useChatWidgetOpen } from '@/lib/slices/ui/selectors'
import YourMessages from './YourMessages'
import ChatLauncher from './ChatLauncher'

const ChatWidget = () => {
    return (
        <>
            <ChatLauncher />
            <ChatWidgetWrapper>
                <YourMessages />
            </ChatWidgetWrapper>
        </>
    )
}

export const ChatWidgetWrapper = ({ children }: { children: React.ReactNode }) => {
    const chatWidgetOpen = useChatWidgetOpen();
    return chatWidgetOpen ? children : null;
}

export default ChatWidget