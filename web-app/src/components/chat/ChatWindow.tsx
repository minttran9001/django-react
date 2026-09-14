"use client";
import { useGetMessagesInfiniteQuery } from "@/lib/api/messageApi/messageApi";
import { Conversation, ConversationMember, PublicUser } from "@/lib/types/conversation";
import type { ChatMessage } from "@/lib/types/message";
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
import { useChatContext } from "@/providers/ChatContext";
import { useMarkConversationSeenMutation } from "@/lib/api/conversationApi/conversationApi";
import { useAuth } from "@/lib/hooks/useAuth";

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
    } = useGetMessagesInfiniteQuery({ conversationId }, { refetchOnMountOrArgChange: true });
    const setActiveConversation = useSetActiveConversation();
    const conversation = useMarketplaceConversation(conversationId);
    const typingStates = useTyping(conversationId);
    const { sendSeen } = useChatContext();
    const [markConversationSeen] = useMarkConversationSeenMutation();
    const { user } = useAuth();

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

    const { recipient, meAsMember } = useMemo(() => {
        if (!conversation?.members?.length) return { recipient: null, meAsMember: null };
        return conversation?.members?.reduce((acc, member) => {
            if (member.user.id === user?.id) {
                acc.meAsMember = member;
            } else {
                acc.recipient = member;
            }
            return acc;
        }, { meAsMember: null, recipient: null } as { meAsMember: ConversationMember | null; recipient: ConversationMember | null });
    }, [conversation, user?.id]);

    const ownWatermarkMs = meAsMember?.lastReadMessageCreatedAt?.getTime() ?? 0;

    const onSeen = useCallback((message: ChatMessage) => {
        if (!conversationId) return;
        if (message.createdAt.getTime() <= ownWatermarkMs) return;
        sendSeen(conversationId, message.createdAt);
        void markConversationSeen({
            conversationId,
            createdAt: message.createdAt,
            clientId: message.clientId,
        });
    }, [conversationId, sendSeen, markConversationSeen, ownWatermarkMs]);

    const seenStates = useMemo(() => {
        return conversation?.members.map(member => {
            return {
                lastReadMessageCreatedAt: member.lastReadMessageCreatedAt,
                user: member.user,
            };
        }).filter(Boolean) as { user: PublicUser; lastReadMessageCreatedAt: Date }[];
    }, [conversation?.members]);

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
                <h2 className="text-lg font-bold">{recipient?.user?.name ?? conversation?.name ?? '?'}</h2>
            </div>
            <MessageList
                seenStates={seenStates}
                typingStates={{ typingMembers }}
                key={conversationId}
                messages={messages}
                isLoading={messages.length === 0 && isLoading}
                isFetchingOlder={isFetchingNextPage}
                hasOlder={Boolean(hasNextPage)}
                onLoadOlder={onLoadOlder}
                onSeen={onSeen}
                ownWatermarkMs={ownWatermarkMs}
            />
            <Composer conversationId={conversationId} className="px-4 pb-4" />
        </div>
    );
};

export default ChatWindow;
