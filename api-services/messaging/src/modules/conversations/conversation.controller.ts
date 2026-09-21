import type { Request, Response } from "express";
import { conversationService } from "./conversation.service.js";
import { parseDmUserId, parseSeenBody } from "./conversation.validators.js";

export class ConversationController {
  list = async (req: Request, res: Response) => {
    const data = await conversationService.listForUser(req.user!.id);
    res.json(data);
  };

  getDirect = async (req: Request, res: Response) => {
    const peerUserId = parseDmUserId(req.query.userId ?? req.query.user_id);
    const data = await conversationService.findDirect(req.user!.id, peerUserId);
    res.json(data);
  };

  markSeen = async (req: Request, res: Response) => {
    const conversationIdParam = String(req.params.conversationId);
    const { conversationId, createdAt, clientId } = parseSeenBody(
      conversationIdParam,
      req.body as Record<string, unknown> | undefined,
    );
    await conversationService.persistSeenWatermark(
      req.user!.id,
      conversationId,
      createdAt,
      clientId,
    );
    res.status(200).end();
  };
}

export const conversationController = new ConversationController();
