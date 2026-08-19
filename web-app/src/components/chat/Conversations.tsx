"use client";

import { useGetConversationsQuery } from "@/lib/api/conversationApi/conversationApi";
import { Avatar, AvatarImage } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import { Loader2 } from "lucide-react";
import { useSetActiveConversation } from "@/lib/slices/chat/actions";
import { Conversation } from "@/lib/types/conversation";
import { useLayoutEffect, useMemo, useRef } from "react";

const REORDER_MS = 220;

const Conversations = () => {
    const { data: conversationByIds, isLoading } = useGetConversationsQuery();
    const conversations = useMemo(
        () =>
            Object.values(conversationByIds || {}).sort(
                (a, b) => (new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()),
            ),
        [conversationByIds],
    );
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
        <div className="flex flex-col px-4 pb-4">
            {isLoading && (
                <div className="flex h-full items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading conversations...</span>
                </div>
            )}
            {conversations.map((conversation) => (
                <div
                    key={conversation.id}
                    ref={(node) => {
                        if (node) itemRefs.current.set(conversation.id, node);
                        else itemRefs.current.delete(conversation.id);
                    }}
                    className="flex cursor-pointer items-center gap-2 border-b border-gray-200 bg-neutral-50 p-2 hover:bg-gray-100"
                    onClick={onConversationClick(conversation.id)}
                >
                    <div className="flex flex-1 items-center gap-2">
                        <Avatar>
                            <AvatarImage
                                src={conversation.lastMessageSender.user.avatar?.url}
                            />
                            <AvatarFallback>
                                {conversation.lastMessageSender.user.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <h2 className="text-sm font-medium">{conversation.name}</h2>
                    </div>
                    <p className="flex-[0.5] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-gray-500">
                        {conversation.lastMessagePreview}
                    </p>
                </div>
            ))}
        </div>
    );
};

export default Conversations;
