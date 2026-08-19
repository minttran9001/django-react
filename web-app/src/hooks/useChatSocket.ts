// hooks/useChatSocket.ts
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  messageApi,
  useDrainOutboxMutation,
} from "@/lib/api/messageApi/messageApi";
import { getChatLocalDb } from "@/lib/localDb";
import { env } from "@/lib/env";
import type { ChatMessage } from "@/lib/types/message";
import { EMessageStatus } from "@/lib/types/message";
import { useAuth } from "@/lib/hooks/useAuth";
import { conversationApi } from "@/lib/api/conversationApi/conversationApi";
import type { RootState } from "@/lib/store";
import { authApi } from "@/lib/api/authApi";
import { shallowEqual } from "react-redux";
import { useSetTyping } from "@/lib/slices/chat/actions";
import { MessageBatchQueue } from "@/utils/batchQueue";

export function wsBase() {
  return env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws");
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

function upsertMessageInCache(
  draft: { pages: { results: ChatMessage[] }[] },
  message: ChatMessage,
  mode: "append" | "replace" | "fail",
) {
  if (draft.pages.length === 0) {
    if (mode === "fail") return;
    draft.pages.push({
      results: [message],
      // @ts-expect-error infinite page shape
      hasMore: true,
      nextBeforeId: null,
    });
    return;
  }

  const page0 = draft.pages[0];
  const idx = page0.results.findIndex((m) => m.clientId === message.clientId);

  if (mode === "fail") {
    if (idx >= 0) page0.results[idx].status = EMessageStatus.FAILED;
    return;
  }
  if (idx >= 0) {
    const prev = page0.results[idx];
    // Keep real/server id when the WS payload still has id: null (early fan-out).
    const id =
      message.id != null && message.id > 0
        ? message.id
        : prev.id > 0
          ? prev.id
          : message.id;
    // Never downgrade sent/acked ← pending from out-of-order events.
    const status =
      statusRank(message.status) >= statusRank(prev.status)
        ? message.status
        : prev.status;
    page0.results[idx] = { ...prev, ...message, id, status };
  } else if (mode === "append" || mode === "replace") {
    page0.results.push(message);
  }
}

/** Wire format: sender is id-only; id may be null on pending. */
type ChatSocketMessage = {
  id?: number | null;
  clientId: string;
  conversationId: number;
  body: string;
  createdAt: number;
  status: EMessageStatus;
  sender: { id: number };
};

enum EChatSocketType {
  MESSAGE_CREATED = "message.created",
  MESSAGE_ACKED = "message.acked",
  MESSAGE_FAILED = "message.failed",
  TYPING = "typing",
}

type ChatSocketData = {
  type: EChatSocketType;
  conversationId: number;
  message?: ChatSocketMessage;
  userId?: number;
  typing?: boolean;
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
    createdAt: message.createdAt,
    status: message.status,
    sender,
  };
}

const resolveSender = (
  state: RootState,
  conversationId: number,
  senderId: number,
): ChatMessage["sender"] => {
  const me = authApi.endpoints.getMe.select()(state).data;
  if (me?.id === senderId) {
    return {
      id: me.id,
      name: me.name,
      avatar: me.avatar,
    };
  }

  const convs = conversationApi.endpoints.getConversations.select()(state).data;
  const conversation =
    convs?.[conversationId] ?? convs?.[String(conversationId)];
  const member = conversation?.members.find((m) => m.user.id === senderId);
  if (member) {
    return {
      id: member.user.id,
      name: member.user.name,
      avatar: member.user.avatar,
    };
  }

  return {
    id: senderId,
    name: "Unknown",
    avatar: null,
  };
};

export function useChatSocket() {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const [drainOutbox] = useDrainOutboxMutation();
  const notifySoundRef = useRef<HTMLAudioElement | null>(null);
  const conversationStates = useAppSelector(
    (state) => state.conversationApi,
    shallowEqual,
  );
  const wsRef = useRef<WebSocket | null>(null);
  const messageStates = useAppSelector(
    (state) => state.messageApi,
    shallowEqual,
  );
  const authStates = useAppSelector((state) => state.authApi, shallowEqual);
  const batchQueueRef = useRef<MessageBatchQueue<ChatMessage> | null>(null);
  const setTyping = useSetTyping();

  const store = useMemo(
    () =>
      ({
        conversationApi: conversationStates,
        messageApi: messageStates,
        authApi: authStates,
      }) as unknown as RootState,
    [conversationStates, messageStates, authStates],
  );

  const storeRef = useRef<typeof store>(store);

  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  useEffect(() => {
    notifySoundRef.current = getNotifySound();
  }, []);

  const appendMessage = useCallback(
    (data: ChatSocketData) => {
      const { type, conversationId, message: messageData } = data;
      if (!messageData) return;

      const existing = messageApi.endpoints.getMessages
        .select({ conversationId })(storeRef.current)
        .data?.pages?.flatMap((p) => p.results)
        .find((m) => m.clientId === messageData.clientId);

      const message = toChatMessage(
        messageData,
        resolveSender(storeRef.current, conversationId, messageData.sender.id),
        existing?.id,
      );
      const db = getChatLocalDb();

      if (type === EChatSocketType.MESSAGE_CREATED) {
        batchQueueRef.current ??= new MessageBatchQueue<ChatMessage>(
          (allMessages) => {
            const messagesByConversationId = allMessages.reduce(
              (acc, message) => {
                acc[message.conversationId] = [
                  ...(acc[message.conversationId] ?? []),
                  message,
                ];
                return acc;
              },
              {} as Record<number, ChatMessage[]>,
            );

            for (const conversationId of Object.keys(
              messagesByConversationId,
            )) {
              const messages =
                messagesByConversationId[parseInt(conversationId)];
              for (const message of messages) {
                dispatch(
                  messageApi.util.updateQueryData(
                    "getMessages",
                    { conversationId: parseInt(conversationId) },
                    (draft) =>
                      upsertMessageInCache(draft as never, message, "append"),
                  ),
                );
              }
            }
          },
        );
        batchQueueRef.current.push(message);
        void db.messages
          .where("clientId")
          .equals(message.clientId)
          .delete()
          .then(() => db.messages.put(message));
      }

      if (type === EChatSocketType.MESSAGE_ACKED) {
        dispatch(
          messageApi.util.updateQueryData(
            "getMessages",
            { conversationId },
            (draft) => upsertMessageInCache(draft as never, message, "replace"),
          ),
        );
        void db.messages
          .where("clientId")
          .equals(message.clientId)
          .delete()
          .then(() => db.messages.put(message));
        void db.deleteOutboxByClientId(message.clientId);
      }

      if (type === EChatSocketType.MESSAGE_FAILED) {
        dispatch(
          messageApi.util.updateQueryData(
            "getMessages",
            { conversationId },
            (draft) =>
              upsertMessageInCache(
                draft as never,
                { ...message, status: EMessageStatus.FAILED },
                "fail",
              ),
          ),
        );
      }
    },
    [dispatch],
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

      const sender = resolveSender(
        storeRef.current,
        conversationId,
        messageData.sender.id,
      );

      dispatch(
        conversationApi.util.updateQueryData(
          "getConversations",
          undefined,
          (draft) => {
            const conversation =
              draft[String(conversationId)] ??
              Object.values(draft).find((c) => c.id === conversationId);
            if (!conversation) return;
            conversation.lastMessagePreview = messageData.body;
            conversation.lastMessageAt = messageData.createdAt;
            conversation.lastMessageSender = {
              user: {
                id: sender.id,
                name: sender.name ?? "",
                avatar: sender.avatar ?? null,
              },
              unread: 0,
              mentionUnread: 0,
            };
          },
        ),
      );
    },
    [dispatch],
  );

  const soundNotification = useCallback((data: ChatSocketData) => {
    if (data.type === EChatSocketType.MESSAGE_CREATED) {
      void notifySoundRef.current?.play();
    }
  }, []);

  const handleTyping = useCallback((data: ChatSocketData) => {
    if (data.type === EChatSocketType.TYPING && data.userId) {
      setTyping(data.conversationId, data.userId, data.typing);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    wsRef.current = new WebSocket(`${wsBase()}/ws/chat/`);

    wsRef.current.onmessage = (ev) => {
      const data = JSON.parse(ev.data) as ChatSocketData;
      console.log("[WebSocket] new event messages:", data);
      soundNotification(data);
      appendMessage(data);
      bumpConversationPreview(data);
      handleTyping(data);
    };

    wsRef.current.onopen = () => {
      console.log("[WebSocket] connected");
      void drainOutbox();
    };

    wsRef.current.onclose = () => {
      console.log("[WebSocket] disconnected");
    };

    wsRef.current.onerror = (ev) => {
      console.error("[WebSocket] error", ev);
    };

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

    const drainOutboxFn = () => {
      void drainOutbox();
    };
    window.addEventListener("online", drainOutboxFn);

    return () => {
      wsRef.current?.close();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("online", drainOutboxFn);
    };
  }, [
    user,
    dispatch,
    appendMessage,
    bumpConversationPreview,
    drainOutbox,
    soundNotification,
    handleTyping,
  ]);

  const sendTyping = useCallback(
    (conversationId: number, typing: boolean) => {
      const userId = user?.id;
      if (!userId) return;
      wsRef.current?.send(
        JSON.stringify({
          type: EChatSocketType.TYPING,
          conversationId,
          userId,
          typing,
        }),
      );
    },
    [user],
  );

  return {
    sendTyping,
  };
}
