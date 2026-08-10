import { useGetConversationsQuery } from "@/lib/api/conversationApi/conversationApi"
import { Avatar, AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { Loader2 } from "lucide-react";
import { useSetActiveConversation } from "@/lib/slices/chat/actions";
import { Conversation } from "@/lib/types/conversation";

const Conversations = () => {
    const { data: conversationByIds, isLoading } = useGetConversationsQuery();
    const conversations = Object.values(conversationByIds || {});
    const setActiveConversation = useSetActiveConversation();

    const onConversationClick = (conversationId: Conversation["id"]) => () => {
        setActiveConversation(conversationId);
    };

    return (
        <div className="flex flex-col">
            {isLoading && <div className="flex items-center justify-center h-full gap-2">
                <Loader2 className="size-4 animate-spin" />
                <span className="text-sm text-gray-500">Loading conversations...</span>
            </div>}
            {conversations?.map((conversation) => (
                <div className="flex items-center gap-2 border-b border-gray-200 p-2 hover:bg-gray-100 cursor-pointer bg-neutral-50" key={conversation.id} onClick={onConversationClick(conversation.id)}>
                    <div className="flex items-center gap-2 flex-1">
                        <Avatar>
                            <AvatarImage src={conversation.lastMessageSender.user.avatar?.url} />
                            <AvatarFallback>
                                {conversation.lastMessageSender.user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-sm font-medium">{conversation.name}</h2>
                    </div>
                    <p className="flex-[0.5] text-sm text-gray-500 text-ellipsis overflow-hidden whitespace-nowrap">{conversation.lastMessagePreview}</p>
                </div>
            ))}
        </div>
    )
}

export default Conversations