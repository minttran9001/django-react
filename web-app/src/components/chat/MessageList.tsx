"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { ChatMessage } from "@/lib/types/message";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import useVirtualizer from "@/hooks/useVirtualizer";

const isOutgoingMessage = (message: ChatMessage, currentUserId: number) => {
    return message.sender.id === currentUserId;
};

const Message = ({
    message,
    currentUserId,
}: {
    message: ChatMessage;
    currentUserId: number;
}) => {
    const isOutgoing = isOutgoingMessage(message, currentUserId);
    const rootClasses = cn("w-fit flex gap-2 text-sm flex-col pb-2", {
        "self-end": isOutgoing,
        "self-start": !isOutgoing,
    });
    const messageClasses = cn("text-sm p-2 rounded-md", {
        "text-white bg-blue-500": isOutgoing,
        "text-black bg-gray-200": !isOutgoing,
    });

    return (
        <div className={rootClasses}>
            <div className="flex gap-2 items-end">
                {!isOutgoing && (
                    <Avatar size="sm">
                        <AvatarImage src={message.sender.avatar?.url} />
                        <AvatarFallback>
                            {message.sender.name?.charAt(0) ?? ""}
                        </AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col gap-2">
                    {!isOutgoing && (
                        <p className="text-xs text-gray-500">{message.sender.name}</p>
                    )}
                    <div className="flex items-center gap-2">
                        <div className={messageClasses}>
                            <p>{message.body}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ESTIMATED_ROW_SIZE = 72;
const NEAR_BOTTOM_PX = 80;
const LOAD_OLDER_TOP_PX = 80;

const MessageList = ({
    messages = [],
    isLoading,
    isFetchingOlder = false,
    hasOlder = false,
    onLoadOlder,
}: {
    messages: ChatMessage[];
    isLoading: boolean;
    isFetchingOlder?: boolean;
    hasOlder?: boolean;
    onLoadOlder?: () => void;
}) => {
    const { user: currentUser } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const prevLengthRef = useRef(0);
    const stickToBottomRef = useRef(true);
    const pendingPrependRef = useRef(false);
    const prevScrollHeightRef = useRef(0);
    const threadKey = messages[0]?.conversationId;

    const getScrollElement = useCallback(() => containerRef.current, []);
    const estimateSize = useCallback(() => ESTIMATED_ROW_SIZE, []);
    const getItemKey = useCallback(
        (index: number) =>
            messages[index]?.id ?? messages[index]?.clientId ?? index,
        [messages],
    );

    const { virtualItems, totalSize, measureElement, scrollToIndex } =
        useVirtualizer({
            getScrollElement,
            estimateSize,
            overscan: 5,
            getItemKey,
            count: messages.length,
        });

    // New conversation → stick to bottom again
    useLayoutEffect(() => {
        prevLengthRef.current = 0;
        stickToBottomRef.current = true;
        pendingPrependRef.current = false;
    }, [threadKey]);

    const onScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;

        if (
            el.scrollTop <= LOAD_OLDER_TOP_PX &&
            hasOlder &&
            !isFetchingOlder &&
            onLoadOlder
        ) {
            prevScrollHeightRef.current = el.scrollHeight;
            pendingPrependRef.current = true;
            onLoadOlder();
        }
    }, [hasOlder, isFetchingOlder, onLoadOlder]);

    // After older pages prepend, keep the same messages under the viewport
    useLayoutEffect(() => {
        if (!pendingPrependRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        const delta = el.scrollHeight - prevScrollHeightRef.current;
        if (delta > 0) {
            el.scrollTop += delta;
        }
        pendingPrependRef.current = false;
    }, [messages.length, totalSize]);

    // Pin to bottom while sticking: first load uses estimates, then
    // measureElement grows totalSize — re-scroll so we don't land mid-list.
    useLayoutEffect(() => {
        if (messages.length === 0) return;

        const prevLength = prevLengthRef.current;
        const grew = messages.length > prevLength;
        const isFirstPaint = prevLength === 0;
        prevLengthRef.current = messages.length;

        if (isFirstPaint) {
            stickToBottomRef.current = true;
        } else if (grew && !stickToBottomRef.current) {
            return;
        }

        if (!stickToBottomRef.current) return;

        scrollToIndex(messages.length - 1, { align: "end" });
    }, [messages.length, totalSize, scrollToIndex]);

    return (
        <div
            ref={containerRef}
            className="overflow-y-auto max-h-100 mb-4 px-4"
            onScroll={onScroll}
        >
            {isFetchingOlder && (
                <div className="flex items-center justify-center py-2 gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-xs text-gray-500">Loading older...</span>
                </div>
            )}
            {isLoading && (
                <div className="flex items-center justify-center h-full gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    <span className="text-sm text-gray-500">Loading messages...</span>
                </div>
            )}
            <div
                style={{
                    height: totalSize,
                    width: "100%",
                    position: "relative",
                }}
            >
                {virtualItems.map((virtualRow) => {
                    const message = messages[virtualRow.index];
                    if (!message) return null;
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={measureElement}
                            className="flex flex-col"
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <Message
                                message={message}
                                currentUserId={currentUser?.id ?? 0}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MessageList;
