"use client";
import { useGetMessagesInfiniteQuery } from "@/lib/api/messageApi/messageApi";
import { Conversation, ConversationMember } from "@/lib/types/conversation";
import Composer from "./Composer";
import { useCallback, useMemo } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "../ui/button";
import { useSetActiveConversation } from "@/lib/slices/chat/actions";
import MessageList from "./MessageList";
import { useTyping } from "@/lib/slices/chat/selectors";
import {
  useMarketplaceConversation,
  useMarketplaceMessagesForPages,
} from "@/lib/slices/marketplaceData/actions";

const ChatWindow = ({
    conversationId,
}: {
    conversationId: Conversation["id"];
}) => {
    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useGetMessagesInfiniteQuery({ conversationId });
    const setActiveConversation = useSetActiveConversation();
    const conversation = useMarketplaceConversation(conversationId);
    const typingStates = useTyping(conversationId);

    const typingMembers = useMemo(() => {
        return Object.keys(typingStates).map(userId => {
            return typingStates[Number(userId)] ? conversation?.members.find(member => member.user.id === Number(userId)) : null;
        }).filter(Boolean) as ConversationMember[];
    }, [typingStates, conversation]);
    const messages = useMarketplaceMessagesForPages(data?.pages);

    const onLoadOlder = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 shadow-sm px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setActiveConversation(null)}
                >
                    <ArrowLeftIcon className="size-4" />
                </Button>
                <h2 className="text-lg font-bold">{conversation?.name || ""}</h2>
            </div>
            <MessageList
                typingStates={{ typingMembers }}
                key={conversationId}
                messages={messages}
                isLoading={messages.length === 0 && isLoading}
                isFetchingOlder={isFetchingNextPage}
                hasOlder={Boolean(hasNextPage)}
                onLoadOlder={onLoadOlder}
            />
            <Composer conversationId={conversationId} className="px-4 pb-4" />
        </div>
    );
};

export default ChatWindow;
