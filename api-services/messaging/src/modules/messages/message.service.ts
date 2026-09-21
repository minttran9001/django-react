import { prisma } from "../../db/prisma.js";
import { requireId } from "../../common/utils/ids.js";
import { HttpError } from "../../common/errors/http-error.js";
import {
  formatMessage,
  formatMessageListEnvelope,
  formatMessageResource,
} from "../../serializers/chat.serializer.js";
import { fanoutToUsers } from "../../websocket/fanout.js";
import { conversationInclude } from "../conversations/conversation.includes.js";
import { conversationService } from "../conversations/conversation.service.js";
import type { ListMessagesQuery, SendMessageInput } from "./message.types.js";

export class MessageService {
  private async displayName(userId: bigint): Promise<string> {
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });
    if (profile?.name) return profile.name;
    const user = await prisma.authUser.findUnique({ where: { id: userId } });
    return user?.email || String(userId);
  }

  private async ensureMember(conversationId: bigint, userId: bigint) {
    const existing = await prisma.member.findFirst({
      where: { conversationId, userId },
    });
    if (existing) return existing;
    return prisma.member.create({
      data: {
        conversationId,
        userId,
        unread: 0,
        mentionUnread: 0,
      },
    });
  }

  private async createConversationWithMembers(
    userId: number,
    memberUserIds: number[],
    name?: string,
  ) {
    const convType = memberUserIds.length === 1 ? "dm" : "muc";

    if (convType === "dm") {
      const peerId = memberUserIds[0]!;
      const peer = await prisma.authUser.findUnique({
        where: { id: BigInt(peerId) },
      });
      if (!peer) {
        throw new HttpError("User not found.", 404, "not_found");
      }

      const existing = await conversationService.findDm(userId, peerId);
      if (existing) {
        const senderMember = await this.ensureMember(
          existing.id,
          BigInt(userId),
        );
        return { conversation: existing, senderMember, created: false };
      }

      const defaultName = name || (await this.displayName(BigInt(peerId)));
      const conversation = await prisma.conversation.create({
        data: {
          type: "dm",
          name: defaultName,
        },
        include: conversationInclude,
      });
      await this.ensureMember(conversation.id, BigInt(peerId));
      const senderMember = await this.ensureMember(
        conversation.id,
        BigInt(userId),
      );
      const full = await prisma.conversation.findUniqueOrThrow({
        where: { id: conversation.id },
        include: conversationInclude,
      });
      return { conversation: full, senderMember, created: true };
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: "muc",
        name: name ?? null,
      },
    });
    const allUserIds = [userId, ...memberUserIds];
    for (const uid of allUserIds) {
      await this.ensureMember(conversation.id, BigInt(uid));
    }
    const senderMember = await this.ensureMember(
      conversation.id,
      BigInt(userId),
    );
    const full = await prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: conversationInclude,
    });
    return { conversation: full, senderMember, created: true };
  }

  private async resolveConversationForSend(
    userId: number,
    data: SendMessageInput,
  ) {
    if (data.conversationId != null) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: BigInt(data.conversationId) },
        include: conversationInclude,
      });
      if (!conversation) {
        throw new HttpError("Not found.", 404, "not_found");
      }
      const senderMember = conversation.members.find(
        (m) => requireId(m.userId) === userId,
      );
      if (!senderMember) {
        throw new HttpError(
          "You are not a member of this conversation.",
          403,
          "not_conversation_member",
        );
      }
      return { conversation, senderMember, created: false };
    }

    if (!data.memberUserIds?.length) {
      throw new HttpError(
        "Conversation id or member user ids are required.",
        400,
        "value_error",
      );
    }

    return this.createConversationWithMembers(
      userId,
      data.memberUserIds,
      data.name,
    );
  }

  private async persistMessage(
    conversationId: bigint,
    senderId: number,
    senderMemberId: bigint,
    clientId: string,
    body: string,
    createdAt: Date,
  ) {
    return prisma.$transaction(async (tx) => {
      const messageInclude = {
        sender: {
          include: {
            profile: { include: { avatar: true } },
          },
        },
      } as const;

      const existing = await tx.message.findUnique({
        where: { clientId },
        include: messageInclude,
      });

      if (existing) {
        return { message: existing, created: false };
      }

      let message;
      try {
        message = await tx.message.create({
          data: {
            conversationId,
            senderId: BigInt(senderId),
            body,
            clientId,
            status: "acked",
            createdAt,
          },
          include: messageInclude,
        });
      } catch (err) {
        const raced = await tx.message.findUnique({
          where: { clientId },
          include: messageInclude,
        });
        if (raced) {
          return { message: raced, created: false };
        }
        throw err;
      }

      await tx.message.update({
        where: { id: message.id },
        data: { createdAt },
      });
      message.createdAt = createdAt;

      await tx.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: createdAt,
          lastMessageContent: body,
          lastMessageSenderId: senderMemberId,
        },
      });

      await tx.member.updateMany({
        where: {
          conversationId,
          userId: { not: BigInt(senderId) },
        },
        data: {
          unread: { increment: 1 },
        },
      });

      return { message, created: true };
    });
  }

  async send(userId: number, data: SendMessageInput) {
    let pendingSent = false;
    let conversationId: bigint | null = null;
    let memberUserIds: number[] = [];
    const clientId = data.clientId;

    try {
      const {
        conversation,
        senderMember,
        created: convCreated,
      } = await this.resolveConversationForSend(userId, data);
      conversationId = conversation.id;
      memberUserIds = conversation.members.map((m) => requireId(m.userId));

      const createdAt = data.createdAt ?? new Date();
      const body = data.body;

      fanoutToUsers(memberUserIds, {
        type: "message.created",
        conversationId: requireId(conversation.id),
        message: {
          id: null,
          clientId,
          conversationId: requireId(conversation.id),
          body,
          status: "sent",
          createdAt: createdAt.toISOString(),
          sender: { id: userId },
        },
      });
      pendingSent = true;

      const { message, created: msgCreated } = await this.persistMessage(
        conversation.id,
        userId,
        senderMember.id,
        clientId,
        body,
        createdAt,
      );

      const conversationPayload = await conversationService.getForResponse(
        conversation.id,
        userId,
      );

      fanoutToUsers(memberUserIds, {
        type: "message.acked",
        conversationId: requireId(conversation.id),
        message: {
          id: requireId(message.id),
          clientId: message.clientId,
          conversationId: requireId(message.conversationId),
          body: message.body,
          status: message.status,
          createdAt: message.createdAt.toISOString(),
          sender: { id: userId },
        },
      });

      return {
        payload: {
          conversation: conversationPayload,
          message: formatMessageResource(message),
          conversationCreated: convCreated,
        },
        statusCode: convCreated || msgCreated ? 201 : 200,
      };
    } catch (err) {
      if (pendingSent && conversationId != null) {
        fanoutToUsers(memberUserIds, {
          type: "message.failed",
          conversationId: requireId(conversationId),
          clientId,
        });
      }
      throw err;
    }
  }

  async list(userId: number, conversationId: number, opts: ListMessagesQuery) {
    const isMember = await prisma.member.findFirst({
      where: {
        conversationId: BigInt(conversationId),
        userId: BigInt(userId),
      },
    });
    if (!isMember) {
      throw new HttpError(
        "You are not a member of this conversation",
        403,
        "forbidden",
      );
    }

    const { limit, beforeId, afterId } = opts;
    let rows;

    if (beforeId != null) {
      rows = await prisma.message.findMany({
        where: {
          conversationId: BigInt(conversationId),
          id: { lt: BigInt(beforeId) },
        },
        include: {
          sender: {
            include: { profile: { include: { avatar: true } } },
          },
        },
        orderBy: { id: "desc" },
        take: limit + 1,
      });
    } else if (afterId != null) {
      rows = await prisma.message.findMany({
        where: {
          conversationId: BigInt(conversationId),
          id: { gt: BigInt(afterId) },
        },
        include: {
          sender: {
            include: { profile: { include: { avatar: true } } },
          },
        },
        orderBy: { id: "asc" },
        take: limit + 1,
      });
    } else {
      rows = await prisma.message.findMany({
        where: { conversationId: BigInt(conversationId) },
        include: {
          sender: {
            include: { profile: { include: { avatar: true } } },
          },
        },
        orderBy: { id: "desc" },
        take: limit + 1,
      });
    }

    const hasMore = rows.length > limit;
    rows = rows.slice(0, limit);
    if (afterId == null) {
      rows = rows.reverse();
    }

    const nextBeforeId =
      hasMore && rows.length > 0 ? requireId(rows[0]!.id) : null;

    return formatMessageListEnvelope({
      results: rows.map(formatMessage),
      hasMore,
      nextBeforeId,
    });
  }
}

export const messageService = new MessageService();
