import type { IncomingMessage } from "node:http";
import { Injectable } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
} from "@nestjs/websockets";
import type { WebSocket } from "ws";
import { requireId } from "../common/utils/ids";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { FanoutService } from "./fanout";

@WebSocketGateway({ path: "/ws/chat" })
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly clients = new WeakMap<WebSocket, number>();

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly fanout: FanoutService,
  ) {}

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    const user = await this.authService.authenticateToken(
      this.authService.extractWsToken(request),
    );
    if (!user || client.readyState !== client.OPEN) {
      client.close();
      return;
    }

    this.clients.set(client, user.id);
    this.fanout.addUserSocket(user.id, client);

    client.on("message", (raw) => {
      void this.onClientMessage(user.id, raw);
    });
  }

  handleDisconnect(client: WebSocket) {
    const userId = this.clients.get(client);
    if (userId == null) return;
    this.clients.delete(client);
    this.fanout.removeUserSocket(userId, client);
  }

  private async onClientMessage(userId: number, raw: unknown) {
    try {
      const content = JSON.parse(String(raw)) as Record<string, unknown>;
      const type = content.type;
      const conversationId = Number(content.conversationId);
      if (!Number.isFinite(conversationId)) return;

      const ids = await this.memberUserIds(conversationId);
      if (!ids.includes(userId)) return;

      if (type === "typing") {
        this.fanout.fanoutToUsers(
          ids.filter((id) => id !== userId),
          {
            type: "typing",
            conversationId,
            userId,
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
          "toISOString" in lastReadMessageCreatedAt
        ) {
          lastReadMessageCreatedAt = (
            lastReadMessageCreatedAt as Date
          ).toISOString();
        }
        if (!lastReadMessageCreatedAt) return;

        this.fanout.fanoutToUsers(ids, {
          type: "seen",
          conversationId,
          userId,
          lastReadMessageCreatedAt,
        });
      }
    } catch {
      // ignore malformed client payloads
    }
  }

  private async memberUserIds(conversationId: number): Promise<number[]> {
    const members = await this.prisma.member.findMany({
      where: { conversationId: BigInt(conversationId) },
      select: { userId: true },
    });
    return members.map((member) => requireId(member.userId));
  }
}
