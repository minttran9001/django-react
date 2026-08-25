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

  const marketplaceUser = marketplaceUserSelectors.selectById(state, senderId);
  if (marketplaceUser) {
    return {
      id: marketplaceUser.id,
      name: marketplaceUser.name,
      avatar: marketplaceUser.avatar,
    };
  }

  const conversation = marketplaceConversationSelectors.selectById(
    state,
    conversationId,
  );
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
        resolveSender(state, conversationId, messageData.sender.id),
        existing?.id,
      );
      const db = getChatLocalDb(user?.id);

      if (type === EChatSocketType.MESSAGE_CREATED) {
        batchQueueRef.current ??= new MessageBatchQueue<ChatMessage>(
          (allMessages) => {
            ingestMessages(dispatch, allMessages);
            const messagesByConversationId = allMessages.reduce(
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
        void db.messages
          .where("clientId")
          .equals(message.clientId)
          .delete()
          .then(() => db.messages.put(message));
      }

      if (type === EChatSocketType.MESSAGE_ACKED) {
        ingestMessages(dispatch, [message]);
        appendMessageClientId(
          dispatch,
          reduxStore.getState,
          conversationId,
          message.clientId,
        );
        void db.messages
          .where("clientId")
          .equals(message.clientId)
          .delete()
          .then(() => db.messages.put(message));
        void db.deleteOutboxByClientId(message.clientId);
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

      const sender = resolveSender(
        reduxStore.getState(),
        conversationId,
        messageData.sender.id,
      );

      dispatch(
        updateMarketplaceConversation({
          id: conversationId,
          changes: {
            lastMessagePreview: messageData.body,
            lastMessageAt: messageData.createdAt,
            lastMessageSender: {
              user: {
                id: sender.id,
                name: sender.name ?? "",
                avatar: sender.avatar ?? null,
              },
              unread: 0,
              mentionUnread: 0,
            },
          },
        }),
      );
      appendConversationId(dispatch, reduxStore.getState, conversationId);
    },
    [dispatch, reduxStore],
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
