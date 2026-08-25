"use client";

import { useGetConversationsQuery } from "@/lib/api/conversationApi/conversationApi";
import { Avatar, AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { Loader2 } from "lucide-react";
import { useSetActiveConversation } from "@/lib/slices/chat/actions";
import { Conversation, ConversationMember } from "@/lib/types/conversation";
import { forwardRef, useLayoutEffect, useMemo, useRef } from "react";
import { stickerMessagePreview } from "@/utils/sticker";
import { useTyping } from "@/lib/slices/chat/selectors";
import { useAuth } from "@/lib/hooks/useAuth";
import { useInboxConversations } from "@/lib/slices/marketplaceData/actions";

const REORDER_MS = 220;

const ConversationItem = forwardRef<HTMLDivElement, { conversation: Conversation, onConversationClick: (conversationId: Conversation["id"]) => () => void }>(({ conversation, onConversationClick }, ref) => {
    const typingStates = useTyping(conversation.id);
    const { user: currentUser } = useAuth();
    const typingMembers = useMemo(() => {
        return Object.keys(typingStates).map(userId => {
            return typingStates[Number(userId)] ? conversation.members.find(member => member.user.id === Number(userId)) : null;
        }).filter(Boolean) as ConversationMember[];
    }, [typingStates, conversation]);

    const typingLabel = typingMembers?.length
        ? typingMembers.length === 1
            ? `${typingMembers[0].user.name} is typing...`
            : "Several people are typing..."
        : null;

    const recipient = useMemo(() => {
        return conversation.members.find(member => member.user.id !== currentUser?.id);
    }, [conversation.members, currentUser?.id]);

    const isGroupConversation = useMemo(() => {
        return conversation.type === 'muc';
    }, [conversation.type]);

    const avatar = useMemo(() => {
        const dmAvatar = (
            <Avatar>
                <AvatarImage src={recipient?.user.avatar?.url} />
                <AvatarFallback>{recipient?.user.name.charAt(0)}</AvatarFallback>
            </Avatar>
        );


        const groupAvatar = (
            <Avatar>
                <AvatarFallback>{conversation.name.charAt(0)}</AvatarFallback>
            </Avatar>
        );

        return isGroupConversation ? groupAvatar : dmAvatar;

    }, [isGroupConversation, recipient, conversation.name]);

    return (
        <div
            ref={ref}
            className="flex cursor-pointer items-center gap-2 border-b border-gray-200 bg-neutral-50 p-2 hover:bg-gray-100"
            onClick={onConversationClick(conversation.id)}
        >
            <div className="flex flex-[0.5] items-center gap-2">
                {avatar}
                <h2 className="text-sm font-medium">{conversation.name}</h2>
            </div>
            <p className="flex-[0.8] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-500">
                {typingLabel ? typingLabel : stickerMessagePreview(conversation.lastMessagePreview)}
            </p>
        </div>
    );
});
ConversationItem.displayName = "ConversationItem";
const Conversations = () => {
    const { data: inbox, isLoading } = useGetConversationsQuery();
    const conversations = useInboxConversations(inbox?.ids);

    const setActiveConversation = useSetActiveConversation();
    const itemRefs = useRef(new Map<Conversation["id"], HTMLElement>());
    const prevTopsRef = useRef(new Map<Conversation["id"], number>());

    useLayoutEffect(() => {
        const nextTops = new Map<Conversation["id"], number>();

        for (const conversation of conversations) {
            const el = itemRefs.current.get(conversation.id);
            if (!el) continue;
            nextTops.set(conversation.id, el.getBoundingClientRect().top);
        }

        for (const conversation of conversations) {
            const el = itemRefs.current.get(conversation.id);
            const prevTop = prevTopsRef.current.get(conversation.id);
            const nextTop = nextTops.get(conversation.id);
            if (!el || prevTop == null || nextTop == null) continue;

            const dy = prevTop - nextTop;
            if (Math.abs(dy) < 1) continue;

            el.style.transition = "none";
            el.style.transform = `translateY(${dy}px)`;
            // Force invert before playing the transition.
            void el.offsetHeight;
            el.style.transition = `transform ${REORDER_MS}ms ease`;
            el.style.transform = "";

            const clear = (event: TransitionEvent) => {
                if (event.propertyName !== "transform") return;
                el.style.transition = "";
                el.removeEventListener("transitionend", clear);
            };
            el.addEventListener("transitionend", clear);
        }

        prevTopsRef.current = nextTops;
    }, [conversations]);

    const onConversationClick = (conversationId: Conversation["id"]) => () => {
        setActiveConversation(conversationId);
    };

    return (
        <div className="flex flex-col px-4 pb-4 max-h-100 overflow-y-auto">
            {isLoading && (
                <div className="flex h-full items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading conversations...</span>
                </div>
            )}
            {conversations.map((conversation) =>
                <ConversationItem
                    key={conversation.id}
                    ref={(node) => {
                        if (node) itemRefs.current.set(conversation.id, node);
                        else itemRefs.current.delete(conversation.id);
                    }}
                    onConversationClick={onConversationClick} conversation={conversation}
                />
            )}
        </div>
    );
};

export default Conversations;
