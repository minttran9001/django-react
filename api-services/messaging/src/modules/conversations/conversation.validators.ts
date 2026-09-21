import { HttpError } from "../../common/errors/http-error.js";

export function parseDmUserId(raw: unknown): number {
  if (raw == null || raw === "") {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      userId: ["This field is required."],
    });
  }
  const peerUserId = Number(raw);
  if (!Number.isFinite(peerUserId)) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      userId: ["This field must be an integer."],
    });
  }
  return peerUserId;
}

export function parseSeenBody(
  conversationIdRaw: string,
  body: Record<string, unknown> | undefined,
): { conversationId: number; createdAt: Date; clientId: string | null } {
  const conversationId = Number(conversationIdRaw);
  if (!Number.isFinite(conversationId)) {
    throw new HttpError("Not found.", 404, "not_found");
  }

  const createdAtRaw = body?.createdAt ?? body?.created_at;
  const clientIdRaw = body?.clientId ?? body?.client_id;
  if (createdAtRaw == null) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      createdAt: ["This field is required."],
    });
  }
  const createdAt = new Date(String(createdAtRaw));
  if (Number.isNaN(createdAt.getTime())) {
    throw new HttpError("Invalid request.", 400, "bad_request", {
      createdAt: ["A valid date is required."],
    });
  }

  const clientId =
    typeof clientIdRaw === "string" && clientIdRaw.length > 0
      ? clientIdRaw
      : null;

  return { conversationId, createdAt, clientId };
}
