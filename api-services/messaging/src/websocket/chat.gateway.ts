import type { IncomingMessage, Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import {
  authenticateToken,
  parseCookieHeader,
  type AuthUser,
} from "../middleware/auth.middleware.js";
import { prisma } from "../db/prisma.js";
import { requireId } from "../common/utils/ids.js";
import { addUserSocket, fanoutToUsers, removeUserSocket } from "./fanout.js";

type AuthedSocket = WebSocket & { user?: AuthUser };

async function memberUserIds(conversationId: number): Promise<number[]> {
  const members = await prisma.member.findMany({
    where: { conversationId: BigInt(conversationId) },
    select: { userId: true },
  });
  return members.map((m) => requireId(m.userId));
}

function extractWsToken(req: IncomingMessage): string | null {
  const cookies = parseCookieHeader(req.headers.cookie);
  if (cookies.access_token) return cookies.access_token;

  const url = new URL(req.url ?? "/", "http://localhost");
  return url.searchParams.get("token");
}

export function attachChatGateway(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/ws/chat" && url.pathname !== "/ws/chat/") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", async (ws: AuthedSocket, req: IncomingMessage) => {
    const user = await authenticateToken(extractWsToken(req));
    if (!user) {
      ws.close();
      return;
    }

    ws.user = user;
    addUserSocket(user.id, ws);

    ws.on("message", async (raw) => {
      try {
        const content = JSON.parse(String(raw)) as Record<string, unknown>;
        const type = content.type;
        const conversationId = Number(content.conversationId);
        if (!Number.isFinite(conversationId)) return;

        const ids = await memberUserIds(conversationId);
        if (!ids.includes(user.id)) return;

        if (type === "typing") {
          fanoutToUsers(
            ids.filter((id) => id !== user.id),
            {
              type: "typing",
              conversationId,
              userId: user.id,
              typing: Boolean(content.typing),
            },
          );
          return;
        }

        if (type === "seen") {
          let lastReadMessageCreatedAt = content.lastReadMessageCreatedAt;
          if (
            lastReadMessageCreatedAt &&
            typeof lastReadMessageCreatedAt === "object" &&
            "toISOString" in (lastReadMessageCreatedAt as object)
          ) {
            lastReadMessageCreatedAt = (
              lastReadMessageCreatedAt as Date
            ).toISOString();
          }
          if (!lastReadMessageCreatedAt) return;

          fanoutToUsers(ids, {
            type: "seen",
            conversationId,
            userId: user.id,
            lastReadMessageCreatedAt,
          });
        }
      } catch {
        // ignore malformed client payloads
      }
    });

    ws.on("close", () => {
      removeUserSocket(user.id, ws);
    });
  });

  return wss;
}
