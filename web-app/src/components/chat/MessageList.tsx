/* eslint-disable react-hooks/refs */
"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChatMessage, EMessageStatus } from "@/lib/types/message";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/lib/hooks/useAuth";
import useVirtualizer from "@/hooks/useVirtualizer";
import { format, isSameDay } from "date-fns";
import { ConversationMember, PublicUser } from "@/lib/types/conversation";
import { RichMessageText } from "../core/RichTextMessage";
import StickerImage from "./StickerImage";
import { parseStickerToken } from "@/utils/sticker";

const isOutgoingMessage = (message: ChatMessage, currentUserId: number) => {
    return message.sender.id === currentUserId;
};

const Message = ({
    className,
    showAvatar,
    message,
    currentUserId,
    onRemeasure,
}: {
    className?: string;
    showAvatar: boolean;
    message: ChatMessage;
    currentUserId: number;
    onRemeasure?: () => void;
}) => {
    const [showStatus, setShowStatus] = useState(false);

    const isOutgoing = isOutgoingMessage(message, currentUserId);
    const sticker = parseStickerToken(message.body ?? "");
    const rootClasses = cn("flex w-fit min-w-0 max-w-3/4 flex-col gap-2 pb-2 text-sm", className, {
        "self-end": isOutgoing,
        "self-start": !isOutgoing,
    });
    const messageClasses = cn("min-w-0 max-w-full overflow-hidden rounded-md p-2 text-sm", {
        "text-white bg-blue-500": isOutgoing,
        "text-black bg-gray-200": !isOutgoing,
    });

    return (
        <div className={rootClasses}>
            <div className="flex min-w-0 max-w-full items-start gap-2">
                {!isOutgoing ? (
                    <Avatar
                        size="sm"
                        className={cn('mt-1 shrink-0 self-start', {
                            "opacity-0": !showAvatar,
                        })}
                    >
                        <AvatarImage src={message.sender.avatar?.url} />
                        <AvatarFallback>
                            {message.sender.name?.charAt(0) ?? ""}
                        </AvatarFallback>
                    </Avatar>
                ) : null}
                <div
                    className={cn("flex min-w-0 max-w-full flex-col gap-2", {
                        "items-end": isOutgoing,
                        "items-start": !isOutgoing,
                    })}
                    onClick={() => {
                        setShowStatus(!showStatus);
                        onRemeasure?.();
                    }}
                >
                    {!isOutgoing && showAvatar && (
                        <p className="text-xs text-gray-500">{message.sender.name}</p>
                    )}
                    <div className="flex min-w-0 max-w-full items-center gap-2">
                        {sticker ? (
                            <StickerImage
                                codepoint={sticker.codepoint}
                                name="Sticker"
                                size={128}
                                animated
                                className="size-32"
                            />
                        ) : (
                            <div className={messageClasses}>
                                <div className="min-w-0 whitespace-pre-wrap wrap-anywhere">
                                    <RichMessageText
                                        text={message.body ?? ""}
                                        variant={isOutgoing ? "outgoing" : "incoming"}
                                        interactive
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    {isOutgoing && (showStatus || message.status === EMessageStatus.PENDING) && (
                        <span className="text-xs text-gray-500 w-fit">
                            {message.status === "pending" ? "Pending" : "Sent"}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const ESTIMATED_ROW_SIZE = 30;
const NEAR_BOTTOM_PX = 80;
const LOAD_OLDER_TOP_PX = 80;

function messageKey(message: ChatMessage | undefined, index: number) {
    return `${message?.id ?? message?.clientId ?? index}-${message?.status ?? "unknown"}`;
}

function isGroupMessagesStart(messages: ChatMessage[], index: number) {
    const MAX_WINDOW_MS = 1000 * 60 * 10;
    const curr = messages[index];
    const prev = messages[index - 1];
    if (!prev || !curr) return true;
    if (curr.sender.id !== prev.sender.id) return true;
    if (curr.createdAt.getTime() - prev.createdAt.getTime() > MAX_WINDOW_MS) return true;
    return false;
}

function showTimeSeparator(messages: ChatMessage[], index: number) {
    const TIME_GAP_MS = 1000 * 60 * 30;
    const curr = messages[index];
    const prev = messages[index - 1];
    if (!prev || !curr) return false;
    return (
        curr.createdAt.getTime() - prev.createdAt.getTime() > TIME_GAP_MS ||
        prev.createdAt.toDateString() !== curr.createdAt.toDateString()
    );
}

const MessageList = ({
    seenStates,
    messages = [],
    isLoading,
    isFetchingOlder = false,
    hasOlder = false,
    onLoadOlder,
    typingStates,
    onSeen,
    ownWatermarkMs = 0,
}: {
    messages: ChatMessage[];
    isLoading: boolean;
    isFetchingOlder?: boolean;
    hasOlder?: boolean;
    onLoadOlder?: () => void;
    typingStates?: { typingMembers?: ConversationMember[] };
    onSeen?: (message: ChatMessage) => void;
    seenStates?: { user: PublicUser; lastReadMessageCreatedAt: Date }[];
    ownWatermarkMs?: number;
}) => {
    const { user: currentUser } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const onSeenRef = useRef(onSeen);
    useEffect(() => {
        onSeenRef.current = onSeen;
    }, [onSeen]);
    const prevLengthRef = useRef(0);
    const stickToBottomRef = useRef(true);
    const suppressScrollEventsRef = useRef(0);
    const lastRestoredScrollTopRef = useRef(0);
    const prevGhostHeightRef = useRef(0);
    const prependAnchorRef = useRef<{
        key: string | number;
        offsetInViewport: number;
        lengthBefore: number;
    } | null>(null);
    const threadKey = messages[0]?.conversationId;

    const getScrollElement = useCallback(() => containerRef.current, []);
    const estimateSize = useCallback(() => ESTIMATED_ROW_SIZE, []);
    const getItemKey = useCallback(
        (index: number) => messageKey(messages[index], index),
        [messages],
    );


    const {
        virtualItems,
        ghostHeight,
        measureElement,
        scrollToIndex,
        scrollToOffset,
        getOffsetForIndex,
        findStartIndex,
        translateY,
    } = useVirtualizer({
        getScrollElement,
        estimateSize,
        overscan: 10,
        getItemKey,
        count: messages.length,
    });

    // New conversation → stick to bottom again
    useLayoutEffect(() => {
        prevLengthRef.current = 0;
        stickToBottomRef.current = true;
        prependAnchorRef.current = null;
        suppressScrollEventsRef.current = 0;
        prevGhostHeightRef.current = 0;
    }, [threadKey]);

    const onScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;

        if (suppressScrollEventsRef.current > 0) {
            suppressScrollEventsRef.current -= 1;
            return;
        }

        const distanceFromBottom =
            el.scrollHeight - el.scrollTop - el.clientHeight;
        stickToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
        const anchor = prependAnchorRef.current;
        if (anchor && messages.length > anchor.lengthBefore) {
            const drift = Math.abs(el.scrollTop - lastRestoredScrollTopRef.current);
            // Stay pinned through minor drift/noise; only drop when user moves away.
            if (drift <= 80) {
                if (
                    el.scrollTop <= LOAD_OLDER_TOP_PX &&
                    hasOlder &&
                    !isFetchingOlder &&
                    onLoadOlder
                ) {
                    const anchorIndex = findStartIndex(el.scrollTop);
                    const key = messageKey(messages[anchorIndex], anchorIndex);
                    prependAnchorRef.current = {
                        key,
                        offsetInViewport: getOffsetForIndex(anchorIndex) - el.scrollTop,
                        lengthBefore: messages.length,
                    };
                    onLoadOlder();
                }
                return;
            }
            prependAnchorRef.current = null;
        }

        if (
            el.scrollTop <= LOAD_OLDER_TOP_PX &&
            hasOlder &&
            !isFetchingOlder &&
            !prependAnchorRef.current &&
            onLoadOlder &&
            messages.length > 0
        ) {
            const anchorIndex = findStartIndex(el.scrollTop);
            const key = messageKey(messages[anchorIndex], anchorIndex);
            prependAnchorRef.current = {
                key,
                offsetInViewport: getOffsetForIndex(anchorIndex) - el.scrollTop,
                lengthBefore: messages.length,
            };
            onLoadOlder();
        }
    }, [
        hasOlder,
        isFetchingOlder,
        onLoadOlder,
        messages,
        findStartIndex,
        getOffsetForIndex,
    ]);

    // Keep visual position by compensating totalSize growth while prepend anchor is held.
    useLayoutEffect(() => {
        const el = containerRef.current;
        const prevGhostHeight = prevGhostHeightRef.current;
        prevGhostHeightRef.current = ghostHeight;
        const anchor = prependAnchorRef.current;
        if (!el || !anchor) return;
        if (messages.length <= anchor.lengthBefore) return;

        // new ghost height - previous ghost height
        const delta = ghostHeight - prevGhostHeight;
        if (delta === 0) return;

        const before = el.scrollTop;
        const target = Math.max(0, before + delta);
        scrollToOffset(target);
        lastRestoredScrollTopRef.current = el.scrollTop;
        // Budget extra browser scroll events per correction (stale echoes).
        suppressScrollEventsRef.current += 3;
    }, [messages.length, ghostHeight, scrollToOffset]);

    // Pin to bottom while sticking: first load uses estimates, then
    // measureElement grows totalSize — re-scroll so we don't land mid-list.
    useLayoutEffect(() => {
        if (messages.length === 0) return;
        if (prependAnchorRef.current) return;

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
    }, [messages.length, ghostHeight, scrollToIndex]);

    const lastSeenCreatedAtMs = useRef(ownWatermarkMs);
    const pendingSeenMessage = useRef<ChatMessage | null>(null);
    const seenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const immediatelyFlag = useRef(true);

    // Keep local watermark at least as high as server/optimistic member watermark.
    if (ownWatermarkMs > lastSeenCreatedAtMs.current) {
        lastSeenCreatedAtMs.current = ownWatermarkMs;
    }

    useLayoutEffect(() => {
        const root = containerRef.current;
        if (!root || !currentUser?.id) return;

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (!entry.isIntersecting) continue;
                    const index = Number(
                        (entry.target as HTMLElement).dataset.index,
                    );
                    if (!Number.isFinite(index)) continue;
                    const message = messages[index];
                    if (!message || message.sender.id === currentUser.id) {
                        continue;
                    }
                    const createdMs = message.createdAt.getTime();
                    if (createdMs <= lastSeenCreatedAtMs.current) continue;
                    const pendingMs =
                        pendingSeenMessage.current?.createdAt.getTime() ?? 0;
                    if (createdMs <= pendingMs) continue;
                    pendingSeenMessage.current = message;
                    if (seenTimer.current) clearTimeout(seenTimer.current);
                    seenTimer.current = setTimeout(() => {
                        const pending = pendingSeenMessage.current;
                        if (!pending) return;
                        onSeenRef.current?.(pending);
                        lastSeenCreatedAtMs.current =
                            pending.createdAt.getTime();
                        pendingSeenMessage.current = null;
                        immediatelyFlag.current = false;
                        seenTimer.current = null;
                    }, immediatelyFlag.current ? 0 : 1000);
                }
            },
            { root, threshold: 0.5 },
        );

        messages.forEach((message, index) => {
            if (message.sender.id === currentUser.id) return;
            const el = window.document.getElementById(
                messageKey(message, index).toString(),
            );
            if (el) observer.observe(el);
        });

        return () => {
            observer.disconnect();
            if (seenTimer.current) {
                clearTimeout(seenTimer.current);
                seenTimer.current = null;
            }
            // messages[] identity changes on every new/acked message; flushing
            // pending here prevents the stuck state where pending blocks
            // re-intersect after the timer was cancelled.
            const pending = pendingSeenMessage.current;
            if (pending) {
                onSeenRef.current?.(pending);
                lastSeenCreatedAtMs.current = Math.max(
                    lastSeenCreatedAtMs.current,
                    pending.createdAt.getTime(),
                );
                pendingSeenMessage.current = null;
                immediatelyFlag.current = false;
            }
        };
    }, [messages, currentUser?.id]);

    const currentUserId = currentUser?.id;
    const seenAvatarsByClientId = useMemo(() => {
        const avatars = new Map<string, PublicUser[]>();
        if (!currentUserId) return avatars;
        const ownMessages = messages.filter(
            (message) => message.sender.id === currentUserId,
        );
        for (const seen of seenStates ?? []) {
            if (seen.user.id === currentUserId) continue;
            const watermarkMs = seen.lastReadMessageCreatedAt.getTime();
            if (watermarkMs <= 0) continue;
            let best: ChatMessage | undefined;
            for (const own of ownMessages) {
                const createdMs = own.createdAt.getTime();
                if (createdMs > watermarkMs) continue;
                if (!best || createdMs >= best.createdAt.getTime()) {
                    best = own;
                }
            }
            if (!best?.clientId) continue;
            const existing = avatars.get(best.clientId) ?? [];
            existing.push(seen.user);
            avatars.set(best.clientId, existing);
        }
        return avatars;
    }, [messages, seenStates, currentUserId]);

    const showSeenStatus = (message: ChatMessage) => {
        const isOwnMessage = message.sender.id === currentUserId;
        if (!isOwnMessage) return null;
        const memberSeenThisMessage = seenAvatarsByClientId.get(message.clientId) ?? [];
        if (!memberSeenThisMessage.length) return null;
        return (
            <div className="flex items-center gap-1 self-end mb-2">
                {memberSeenThisMessage.map(user => (
                    <Avatar size="xs" key={user.id} className="[animation:seen-drop_300ms_ease-out]">
                        <AvatarImage src={user.avatar?.url} />
                        <AvatarFallback>
                            {user.name?.charAt(0) ?? ""}
                        </AvatarFallback>
                    </Avatar>
                ))}
            </div>
        );
    }
    const typingLabel = typingStates?.typingMembers?.length
        ? typingStates.typingMembers.length === 1
            ? `${typingStates.typingMembers[0].user.name} is typing...`
            : "Several people are typing..."
        : null;

    return (
        <>
            <div className="flex flex-col max-h-100 w-full">
                <div className="relative min-h-0 flex-1">
                    {isFetchingOlder && (
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center gap-2 bg-background/80 py-2">
                            <Loader2 className="size-4 animate-spin" />
                            <span className="text-xs text-gray-500">Loading older...</span>
                        </div>
                    )}
                    <div
                        ref={containerRef}
                        className="h-100 overflow-y-auto px-4 mb-2 w-full"
                        onScroll={onScroll}
                    >
                        {isLoading && (
                            <div className="flex absolute inset-0 h-full min-h-full items-center justify-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                <span className="text-sm text-gray-500">Loading messages...</span>
                            </div>
                        )}
                        <div className="flex min-h-full flex-col justify-end">
                            <div
                                style={{
                                    height: ghostHeight,
                                    width: "100%",
                                    position: "relative",
                                }}
                            >
                                <div className="w-full" style={{ transform: `translateY(${translateY}px)` }}>
                                    {virtualItems.map((virtualRow) => {
                                        const message = messages[virtualRow.index];
                                        if (!message) return null;
                                        const seenEl = showSeenStatus(message);
                                        const showTimeSeparatorEl = showTimeSeparator(messages, virtualRow.index);
                                        return (
                                            <div
                                                id={messageKey(message, virtualRow.index).toString()}
                                                key={`${virtualRow.key}-${showTimeSeparatorEl ? "has-time-separator" : "message"}-${seenEl ? "has-seen" : "no-seen"}`}
                                                data-index={virtualRow.index}
                                                data-key={String(virtualRow.key)}
                                                className="flex w-full min-w-0 flex-col"
                                                ref={measureElement}
                                            >
                                                {showTimeSeparatorEl ? (
                                                    <time
                                                        className="py-2 text-center text-xs text-gray-500"
                                                        dateTime={message.createdAt.toISOString()}
                                                    >
                                                        {isSameDay(message.createdAt, new Date())
                                                            ? format(message.createdAt, "HH:mm")
                                                            : format(
                                                                message.createdAt,
                                                                "MM/dd/yyyy HH:mm",
                                                            )}
                                                    </time>
                                                ) : null}

                                                <Message
                                                    showAvatar={isGroupMessagesStart(
                                                        messages,
                                                        virtualRow.index,
                                                    )}
                                                    message={message}
                                                    currentUserId={currentUser?.id ?? 0}
                                                    className={cn({ "pb-1": !!seenEl })}
                                                />

                                                {seenEl}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
            <div className="flex h-2 shrink-0 items-center gap-2 px-3">
                {typingLabel ? (
                    <p className="text-xs text-gray-500">{typingLabel}</p>
                ) : (
                    <p className="text-xs text-gray-500 opacity-0">No one is typing...</p>
                )}
            </div>
        </>
    );
};

export default MessageList;
