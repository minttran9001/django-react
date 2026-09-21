import { prisma } from "../../db/prisma.js";
import { requireId } from "../../common/utils/ids.js";
import { HttpError } from "../../common/errors/http-error.js";
import { formatConversation } from "../../serializers/chat.serializer.js";
import { conversationInclude } from "./conversation.includes.js";

export class ConversationService {
  async listForUser(userId: number) {
    const memberships = await prisma.member.findMany({
      where: { userId: BigInt(userId) },
      select: {
        conversationId: true,
        unread: true,
        mentionUnread: true,
      },
    });

    if (memberships.length === 0) {
      return { type: "conversation" as const, data: [] };
    }

    const unreadByConversation = new Map(
      memberships.map((m) => [
        requireId(m.conversationId),
        { unread: m.unread, mentionUnread: m.mentionUnread },
      ]),
    );

    const conversations = await prisma.conversation.findMany({
      where: {
        id: { in: memberships.map((m) => m.conversationId) },
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    });

    const payload = conversations.map((conversation) => {
      const counts = unreadByConversation.get(requireId(conversation.id)) ?? {
        unread: 0,
        mentionUnread: 0,
      };
      return formatConversation({
        ...conversation,
        unread: counts.unread,
        mentionUnread: counts.mentionUnread,
      });
    });

    return {
      type: "conversation" as const,
      data: payload.map((item) => item.data),
    };
  }

  async findDirect(userId: number, peerUserId: number) {
    if (peerUserId === userId) {
      throw new HttpError(
        "You cannot send a message to yourself.",
        403,
        "forbidden",
        { userId: ["You cannot send a message to yourself."] },
      );
    }

    const peer = await prisma.authUser.findUnique({
      where: { id: BigInt(peerUserId) },
    });
    if (!peer) {
      throw new HttpError("User not found.", 404, "not_found");
    }

    const conversation = await this.findDm(userId, peerUserId);
    if (!conversation) {
      return { type: "conversation" as const, data: null };
    }

    const myMember = conversation.members.find(
      (m) => requireId(m.userId) === userId,
    );

    return formatConversation({
      ...conversation,
      unread: myMember?.unread ?? 0,
      mentionUnread: myMember?.mentionUnread ?? 0,
    });
  }

  async findDm(userId: number, peerUserId: number) {
    const candidates = await prisma.conversation.findMany({
      where: {
        type: "dm",
        AND: [
          { members: { some: { userId: BigInt(userId) } } },
          { members: { some: { userId: BigInt(peerUserId) } } },
        ],
      },
      include: conversationInclude,
      orderBy: [{ lastMessageAt: "desc" }, { id: "desc" }],
    });

    return candidates[0] ?? null;
  }

  async getForResponse(conversationId: bigint, viewerUserId: number) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) {
      throw new HttpError("Not found.", 404, "not_found");
    }
    const myMember = conversation.members.find(
      (m) => requireId(m.userId) === viewerUserId,
    );
    return formatConversation({
      ...conversation,
      unread: myMember?.unread ?? 0,
      mentionUnread: myMember?.mentionUnread ?? 0,
    });
  }

  async persistSeenWatermark(
    userId: number,
    conversationId: number,
    createdAt: Date,
    clientId?: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findUnique({
        where: { id: BigInt(conversationId) },
      });
      if (!conversation) {
        throw new HttpError("Not found.", 404, "not_found");
      }

      const member = await tx.member.findFirst({
        where: {
          userId: BigInt(userId),
          conversationId: BigInt(conversationId),
        },
      });
      if (!member) {
        throw new HttpError(
          "You are not a member of this conversation",
          403,
          "NOT_CONVERSATION_MEMBER",
        );
      }

      const upper = new Date(createdAt.getTime() + 1);

      let message: { id: bigint; createdAt: Date } | null = null;
      let resolvedByClientId = false;

      if (clientId) {
        message = await tx.message.findFirst({
          where: {
            conversationId: BigInt(conversationId),
            clientId,
          },
          select: { id: true, createdAt: true },
        });
        resolvedByClientId = message != null;
      }

      let watermark: Date;
      if (resolvedByClientId && message) {
        watermark = message.createdAt;
      } else {
        watermark = createdAt;
        message = await tx.message.findFirst({
          where: {
            conversationId: BigInt(conversationId),
            createdAt: { lt: upper },
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: { id: true, createdAt: true },
        });
      }

      if (
        member.lastReadMessageCreatedAt != null &&
        member.lastReadMessageCreatedAt >= watermark &&
        (message == null || member.lastReadMessageId === message.id)
      ) {
        return { member, updated: false };
      }

      const remainingUnread = await tx.message.count({
        where: {
          conversationId: BigInt(conversationId),
          createdAt: { gt: watermark },
          senderId: { not: BigInt(userId) },
        },
      });

      const updated = await tx.member.update({
        where: { id: member.id },
        data: {
          lastReadMessageId: message?.id ?? null,
          lastReadAt: new Date(),
          lastReadMessageCreatedAt: watermark,
          unread: remainingUnread,
        },
      });

      return { member: updated, updated: true };
    });
  }
}

export const conversationService = new ConversationService();
