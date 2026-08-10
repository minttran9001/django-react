import { useGetMessagesQuery } from "@/lib/api/messageApi/messageApi";
import { useAuth } from "@/lib/hooks/useAuth";
import { Conversation } from "@/lib/types/conversation";
import { ChatMessage } from "@/lib/types/message";
import { cn } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import Composer from "./Composer";
import { useEffect, useMemo, useRef } from "react";

const isOutgoingMessage = (message: ChatMessage, currentUserId: number) => {
    return message.sender.id === currentUserId;
}

const Message = ({ message, currentUserId }: { message: ChatMessage, currentUserId: number }) => {
    const isOutgoing = isOutgoingMessage(message, currentUserId);
    const rootClasses = cn(
        "w-fit flex gap-2 text-sm flex-col",
        {
            'self-end': isOutgoing,
            'self-start': !isOutgoing,
        }
    )
    const messageClasses = cn(
        "text-sm p-2 rounded-md",
        {
            'text-white bg-blue-500': isOutgoing,
            'text-black bg-gray-200': !isOutgoing,
        }
    )

    // const sentAtClasses = cn(
    //     "text-xs text-gray-500",
    //     {
    //         'text-right': isOutgoing,
    //         'text-left': !isOutgoing,
    //     }
    // )

    return (
        <div key={message.id} className={rootClasses}>
            <div className="flex gap-2 items-end">
                {!isOutgoing && <Avatar size="sm">
                    <AvatarImage src={message.sender.avatar?.url} />
                    <AvatarFallback>{message.sender.name.charAt(0)}</AvatarFallback>
                </Avatar>
                }
                <div className="flex flex-col gap-2">
                    {!isOutgoing && <p className="text-xs text-gray-500">{message.sender.name}</p>}
                    <div className="flex items-center gap-2">

                        <div className={messageClasses}>
                            <p>{message.body}</p>
                        </div>
                    </div>
                </div>
            </div>
            {/* <p className={sentAtClasses}>{formatDate(message.createdAt, "MM/dd/yyyy HH:mm")}</p> */}
        </div>
    )
}

const ChatWindow = ({ conversationId }: { conversationId: Conversation["id"] }) => {
    const { user: currentUser } = useAuth();
    const { data: messageListResponse } = useGetMessagesQuery({ conversationId });

    const messages = useMemo(() => messageListResponse?.results || [], [messageListResponse]);

    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        // scroll to the bottom of the container
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="flex flex-col gap-2">
            <div ref={containerRef} className="overflow-y-auto max-h-100 flex flex-col gap-2 mb-4">
                {messages.map((message) => (
                    <Message key={message.id} message={message} currentUserId={currentUser?.id ?? 0} />
                ))}
            </div>
            <Composer conversationId={conversationId} />
        </div>
    )
}

export default ChatWindow;