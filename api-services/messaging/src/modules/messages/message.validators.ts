import { HttpError } from "../../common/errors/http-error";
import type {
  ListMessagesQuery,
  SendMessageBody,
  SendMessageInput,
} from "./message.types";

export function parseSendMessageBody(
  body: SendMessageBody,
  currentUserId: number,
): SendMessageInput {
  if (!body || typeof body !== "object") {
    throw new HttpError("Invalid request.", 400, "bad_request");
  }
  const data = body as Record<string, unknown>;

  const messageBody = data.body;
  const clientId = data.clientId ?? data.client_id;
  if (typeof messageBody !== "string" || messageBody.length === 0) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      body: ["This field is required."],
    });
  }
  if (messageBody.length > 1000) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      body: ["Ensure this field has no more than 1000 characters."],
    });
  }
  if (typeof clientId !== "string" || clientId.length === 0) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      clientId: ["This field is required."],
    });
  }

  const conversationIdRaw = data.conversationId ?? data.conversation_id;
  const memberUserIdsRaw = data.memberUserIds ?? data.member_user_ids;
  const name = data.name;
  const createdAtRaw = data.createdAt ?? data.created_at;

  let conversationId: number | undefined;
  if (conversationIdRaw != null) {
    conversationId = Number(conversationIdRaw);
    if (!Number.isFinite(conversationId)) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        conversationId: ["A valid integer is required."],
      });
    }
  }

  let memberUserIds: number[] | undefined;
  if (Array.isArray(memberUserIdsRaw)) {
    memberUserIds = memberUserIdsRaw.map((id) => Number(id));
    if (memberUserIds.some((id) => !Number.isFinite(id))) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        memberUserIds: ["A valid integer is required."],
      });
    }
  }

  let createdAt: Date | undefined;
  if (createdAtRaw != null) {
    createdAt = new Date(String(createdAtRaw));
    if (Number.isNaN(createdAt.getTime())) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        createdAt: ["A valid date is required."],
      });
    }
    // Far-future client timestamps pin last_message_at and make peer unread
    // impossible to clear (seen watermarks compare created_at). Allow a small
    // clock-skew window for legitimate outbox clients, then clamp to now.
    const maxFutureMs = 5 * 60 * 1000;
    if (createdAt.getTime() > Date.now() + maxFutureMs) {
      createdAt = new Date();
    }
  }

  if (conversationId == null) {
    if (!memberUserIds?.length) {
      throw new HttpError(
        "Conversation id or member user ids are required",
        400,
        "bad_request",
      );
    }
    if (new Set(memberUserIds).size !== memberUserIds.length) {
      throw new HttpError("Member user ids must be unique", 400, "bad_request");
    }
  }

  if (memberUserIds?.length === 1 && memberUserIds[0] === currentUserId) {
    throw new HttpError(
      "You cannot send a message to yourself",
      400,
      "bad_request",
      { memberUserIds: ["You cannot send a message to yourself"] },
    );
  }
  if (memberUserIds?.includes(currentUserId)) {
    throw new HttpError(
      "You cannot send a message to yourself",
      400,
      "bad_request",
      { memberUserIds: ["You cannot send a message to yourself"] },
    );
  }

  return {
    body: messageBody,
    clientId,
    conversationId,
    memberUserIds,
    name: typeof name === "string" ? name : undefined,
    createdAt,
  };
}

export function parseListMessagesQuery(
  conversationIdRaw: string,
  query: ListMessagesQuery,
): { conversationId: number } & ListMessagesQuery {
  const conversationId = Number(conversationIdRaw);
  if (!Number.isFinite(conversationId)) {
    throw new HttpError("Not found.", 404, "not_found");
  }

  const limitRaw = query.limit;
  const beforeRaw = query.beforeId ?? query.before_id;
  const afterRaw = query.afterId ?? query.after_id;

  let limit = 40;
  if (limitRaw != null) {
    limit = Number(limitRaw);
    if (!Number.isFinite(limit) || limit < 1 || limit > 100) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        limit: ["Ensure this value is between 1 and 100."],
      });
    }
  }

  let beforeId: number | undefined;
  if (beforeRaw != null && beforeRaw !== "") {
    beforeId = Number(beforeRaw);
    if (!Number.isFinite(beforeId) || beforeId < 1) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        beforeId: ["A valid integer is required."],
      });
    }
  }

  let afterId: number | undefined;
  if (afterRaw != null && afterRaw !== "") {
    afterId = Number(afterRaw);
    if (!Number.isFinite(afterId) || afterId < 1) {
      throw new HttpError("Invalid request.", 400, "bad_request", {
        afterId: ["A valid integer is required."],
      });
    }
  }

  return { conversationId, limit, beforeId, afterId };
}
