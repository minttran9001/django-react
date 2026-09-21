// hooks/useChatSocket.ts
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch } from "@/lib/hooks";
import {
  appendMessageClientId,
  ingestMessages,
  useDrainOutboxMutation,
} from "@/lib/api/messageApi/messageApi";
import { appendConversationId } from "@/lib/api/conversationApi/conversationApi";
import { getChatLocalDb } from "@/lib/localDb";
import { env } from "@/lib/env";
import type { ChatMessage } from "@/lib/types/message";
import { EMessageStatus } from "@/lib/types/message";
import { useAuth } from "@/lib/hooks/useAuth";
import type { RootState } from "@/lib/store";
import { authApi } from "@/lib/api/authApi";
import { useStore } from "react-redux";
import { useSetTyping } from "@/lib/slices/chat/actions";
import {
  marketplaceConversationSelectors,
  marketplaceMessageSelectors,
  marketplaceUserSelectors,
  updateMarketplaceConversation,
} from "@/lib/slices/marketplaceData/slice";
import { MessageBatchQueue } from "@/utils/batchQueue";
import { ConversationMember } from "@/lib/types/conversation";
import { asDate } from "@/lib/dates";

export function wsBase() {
  return env.NEXT_PUBLIC_CHAT_API_URL.replace(/^http/, "ws");
}

function getNotifySound(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  const sound = new Audio("/sounds/new-message.mp3");
  sound.volume = 1;
  return sound;
}

function statusRank(status: EMessageStatus | string | undefined): number {
  switch (status) {
    case EMessageStatus.FAILED:
      return -1;
    case EMessageStatus.PENDING:
      return 0;
    case EMessageStatus.SENT:
      return 1;
    case EMessageStatus.ACKED:
      return 2;
    default:
      return 0;
  }
}

/** Wire format: sender is id-only; id may be null on pending. */
type ChatSocketMessage = {
  id?: number | null;
  clientId: string;
  conversationId: number;
  body: string;
  createdAt: string;
  status: EMessageStatus;
  sender: { id: number };
};

enum EChatSocketType {
  MESSAGE_CREATED = "message.created",
  MESSAGE_ACKED = "message.acked",
  MESSAGE_FAILED = "message.failed",
  TYPING = "typing",
  SEEN = "seen",
}

type ChatSocketData = {
  type: EChatSocketType;
  conversationId: number;
  message?: ChatSocketMessage;
  userId?: number;
  typing?: boolean;
  lastReadMessageCreatedAt?: Date | string;
};

function toChatMessage(
  message: ChatSocketMessage,
  sender: ChatMessage["sender"],
  existingId?: number,
): ChatMessage {
  const incomingId = message.id;
  const id =
    incomingId != null && incomingId > 0
      ? incomingId
      : existingId != null && existingId > 0
        ? existingId
        : (incomingId ?? -Date.now());

  return {
    id,
    clientId: message.clientId,
    conversationId: message.conversationId,
    body: message.body,
    createdAt: asDate(message.createdAt),
    status: message.status,
    sender,
  };
}

function mergeWithExisting(
  incoming: ChatMessage,
  existing: ChatMessage | undefined,
): ChatMessage {
  if (!existing) return incoming;
  return {
    ...incoming,
    id: incoming.id > 0 ? incoming.id : existing.id,
    createdAt: existing.createdAt,
    status:
      statusRank(existing.status) > statusRank(incoming.status)
        ? existing.status
        : incoming.status,
  };
}

const resolveSender = (
  state: RootState,
  conversationId: number,
  senderId: number,
): ConversationMember => {
  const me = authApi.endpoints.getMe.select()(state).data;
  const conversation = marketplaceConversationSelectors.selectById(
    state,
    conversationId,
  );
  const member = (conversation?.members.find((m) => m.user.id === senderId) ??
    {}) as ConversationMember;
  if (me?.id === senderId) {
    return {
      ...member,
      user: {
        id: me.id,
        name: me.name,
        avatar: me.avatar ?? null,
      },
    };
  }

  const marketplaceUser = marketplaceUserSelectors.selectById(state, senderId);
  if (marketplaceUser) {
    return {
      ...member,
      user: {
        id: marketplaceUser.id,
        name: marketplaceUser.name,
        avatar: marketplaceUser.avatar,
      },
    };
  }

  if (member) {
    return {
      ...member,
      user: {
        id: member.user.id,
        name: member.user.name,
        avatar: member.user.avatar ?? null,
      },
    };
  }

  return {
    unread: 0,
    mentionUnread: 0,
    lastReadMessageId: 0,
    lastReadAt: new Date(0),
    lastReadMessageCreatedAt: new Date(0),
    user: {
      id: senderId,
      name: "Unknown",
      avatar: null,
    },
  };
};

export function useChatSocket() {
  const dispatch = useAppDispatch();
  const reduxStore = useStore<RootState>();
  const { user } = useAuth();
  const [drainOutbox] = useDrainOutboxMutation();
  const notifySoundRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const batchQueueRef = useRef<MessageBatchQueue<ChatMessage> | null>(null);
  const setTyping = useSetTyping();

  useEffect(() => {
    notifySoundRef.current = getNotifySound();
  }, []);

  const appendMessage = useCallback(
    (data: ChatSocketData) => {
      const { type, conversationId, message: messageData } = data;
      if (!messageData) return;

      const state = reduxStore.getState();
      const existing = marketplaceMessageSelectors.selectById(
        state,
        messageData.clientId,
      );

      const nextStatus =
        existing && statusRank(messageData.status) < statusRank(existing.status)
          ? existing.status
          : messageData.status;

      const message = toChatMessage(
        { ...messageData, status: nextStatus },
        resolveSender(state, conversationId, messageData.sender.id).user,
        existing?.id,
      );

      if (!user?.id) {
        return;
      }

      const db = getChatLocalDb(user?.id);

      if (type === EChatSocketType.MESSAGE_CREATED) {
        batchQueueRef.current ??= new MessageBatchQueue<ChatMessage>(
          (allMessages) => {
            const stateAtFlush = reduxStore.getState();
            const merged = allMessages.map((queued) =>
              mergeWithExisting(
                queued,
                marketplaceMessageSelectors.selectById(
                  stateAtFlush,
                  queued.clientId,
                ),
              ),
            );
            ingestMessages(dispatch, merged);
            const messagesByConversationId = merged.reduce(
              (acc, queued) => {
                acc[queued.conversationId] = [
                  ...(acc[queued.conversationId] ?? []),
                  queued,
                ];
                return acc;
              },
              {} as Record<number, ChatMessage[]>,
            );

            for (const id of Object.keys(messagesByConversationId)) {
              const messages = messagesByConversationId[parseInt(id)];
              for (const queued of messages) {
                appendMessageClientId(
                  dispatch,
                  reduxStore.getState,
                  parseInt(id),
                  queued.clientId,
                );
              }
            }
          },
        );
        batchQueueRef.current.push(message);
        void db.putMessages([message]);
      }

      if (type === EChatSocketType.MESSAGE_ACKED) {
        const merged = mergeWithExisting(message, existing);
        ingestMessages(dispatch, [merged]);
        appendMessageClientId(
          dispatch,
          reduxStore.getState,
          conversationId,
          merged.clientId,
        );
        void db.putMessages([merged]);
        void db.deleteOutboxByClientId(merged.clientId);
      }

      if (type === EChatSocketType.MESSAGE_FAILED) {
        const failed = { ...message, status: EMessageStatus.FAILED };
        ingestMessages(dispatch, [failed]);
      }
    },
    [dispatch, reduxStore, user?.id],
  );

  const bumpConversationPreview = useCallback(
    (data: ChatSocketData) => {
      const { type, conversationId, message: messageData } = data;
      if (!messageData) return;
      if (
        type !== EChatSocketType.MESSAGE_CREATED &&
        type !== EChatSocketType.MESSAGE_ACKED
      )
        return;

      const isCreated = type === EChatSocketType.MESSAGE_CREATED;

      const sender = resolveSender(
        reduxStore.getState(),
        conversationId,
        messageData.sender.id,
      );

      if (!user?.id) {
        return;
      }

      const db = getChatLocalDb(user?.id);

      const conversation = marketplaceConversationSelectors.selectById(
        reduxStore.getState(),
        conversationId,
      );
      if (!conversation) return;

      const meAsMember = conversation.members.find(
        (member) => member.user.id === user?.id,
      ) as ConversationMember;

      const isOwnMessage = messageData.sender.id === user?.id;

      const newMeAsMember = {
        ...meAsMember,
        ...(!isOwnMessage ? { unread: meAsMember.unread + 1 } : {}),
      };

      const newMembers = conversation?.members.map((member) =>
        member.user.id === user?.id ? newMeAsMember : member,
      );

      const changes = {
        lastMessagePreview: messageData.body,
        lastMessageAt: asDate(messageData.createdAt),
        lastMessageSender: sender,
        ...(isCreated ? { members: newMembers } : {}),
      };

      void db.putConversation({
        ...conversation,
        ...changes,
      });
      dispatch(
        updateMarketplaceConversation({
          id: conversationId,
          changes,
        }),
      );
      appendConversationId(dispatch, reduxStore.getState, conversationId);
    },
    [dispatch, user?.id],
  );

  const soundNotification = useCallback(
    (data: ChatSocketData) => {
      if (
        data.type === EChatSocketType.MESSAGE_CREATED &&
        data.message?.sender.id !== user?.id
      ) {
        void notifySoundRef.current?.play();
      }
    },
    [user],
  );

  const handleTyping = useCallback((data: ChatSocketData) => {
    if (data.type === EChatSocketType.TYPING && data.userId) {
      setTyping(data.conversationId, data.userId, data.typing);
    }
  }, []);

  const handleSeen = useCallback(
    (data: ChatSocketData) => {
      if (data.type === EChatSocketType.SEEN && data.userId) {
        if (!user?.id) {
          return;
        }
        const db = getChatLocalDb(user?.id);
        const conversation = marketplaceConversationSelectors.selectById(
          reduxStore.getState(),
          data.conversationId,
        );
        if (!conversation) return;
        const conversationChanges = {
          members: conversation.members.map((member) => {
            if (member.user.id !== data.userId) return member;
            if (data.lastReadMessageCreatedAt == null) return member;
            const nextCreatedAt = asDate(data.lastReadMessageCreatedAt);
            if (
              member.lastReadMessageCreatedAt.getTime() >=
              nextCreatedAt.getTime()
            ) {
              return member;
            }
            return {
              ...member,
              lastReadMessageCreatedAt: nextCreatedAt,
            };
          }),
        };

        void db.putConversation({
          ...conversation,
          ...conversationChanges,
        });

        dispatch(
          updateMarketplaceConversation({
            id: data.conversationId,
            changes: conversationChanges,
          }),
        );
      }
    },
    [dispatch, user?.id],
  );

  useEffect(() => {
    if (!user) return;

    let disposed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const clearReconnectTimer = () => {
      if (reconnectTimer === undefined) return;
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    };

    const teardownSocket = () => {
      const existing = wsRef.current;
      if (!existing) return;
      existing.onclose = null;
      existing.onerror = null;
      existing.onmessage = null;
      existing.onopen = null;
      if (existing.readyState !== WebSocket.CLOSED) {
        existing.close();
      }
      wsRef.current = null;
    };

    const connect = () => {
      if (disposed) return;
      clearReconnectTimer();

      const state = wsRef.current?.readyState;
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;

      teardownSocket();
      const ws = new WebSocket(`${wsBase()}/ws/chat/`);
      wsRef.current = ws;

      ws.onmessage = (ev) => {
        const data = JSON.parse(ev.data) as ChatSocketData;
        console.log("[WebSocket] new event messages:", data);
        soundNotification(data);
        appendMessage(data);
        bumpConversationPreview(data);
        handleTyping(data);
        handleSeen(data);
      };

      ws.onopen = () => {
        console.log("[WebSocket] connected");
        void drainOutbox();
      };

      ws.onclose = () => {
        console.log("[WebSocket] disconnected");
        wsRef.current = null;
        if (disposed) return;
        reconnectTimer = setTimeout(connect, 1000);
      };

      ws.onerror = (ev) => {
        console.error("[WebSocket] error", ev);
      };
    };

    connect();

    const unlock = () => {
      const sound = notifySoundRef.current;
      if (!sound) return;
      void sound.play().then(() => {
        sound.pause();
        sound.currentTime = 0;
      });
      window.removeEventListener("pointerdown", unlock);
    };
    window.addEventListener("pointerdown", unlock);

    const reconnectIfNeeded = () => {
      if (document.visibilityState !== "visible") return;
      const state = wsRef.current?.readyState;
      console.log({ state });
      if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) return;
      console.log("[WebSocket] reconnecting");
      connect();
    };
    const onOnline = () => {
      reconnectIfNeeded();
      void drainOutbox();
    };
    window.addEventListener("visibilitychange", reconnectIfNeeded);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      clearReconnectTimer();
      teardownSocket();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("visibilitychange", reconnectIfNeeded);
      window.removeEventListener("online", onOnline);
    };
  }, [
    user,
    dispatch,
    appendMessage,
    bumpConversationPreview,
    drainOutbox,
    soundNotification,
    handleTyping,
    handleSeen,
  ]);

  const emitEvent = useCallback(
    (data: ChatSocketData) => {
      if (
        !wsRef.current ||
        (wsRef.current && wsRef.current.readyState !== WebSocket.OPEN) ||
        !user?.id
      )
        return;
      wsRef.current?.send(
        JSON.stringify({
          ...data,
          userId: user?.id,
        }),
      );
    },
    [user?.id],
  );

  const sendTyping = useCallback(
    (conversationId: number, typing: boolean) => {
      emitEvent({ type: EChatSocketType.TYPING, conversationId, typing });
    },
    [emitEvent],
  );

  const sendSeen = useCallback(
    (conversationId: number, lastReadMessageCreatedAt: Date) => {
      emitEvent({
        type: EChatSocketType.SEEN,
        conversationId,
        lastReadMessageCreatedAt,
      });
    },
    [emitEvent],
  );

  return {
    sendTyping,
    sendSeen,
  };
}
