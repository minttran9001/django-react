import type { Request, Response } from "express";
import { messageService } from "./message.service.js";
import {
  parseListMessagesQuery,
  parseSendMessageBody,
} from "./message.validators.js";

export class MessageController {
  send = async (req: Request, res: Response) => {
    const data = parseSendMessageBody(req.body, req.user!.id);
    const { payload, statusCode } = await messageService.send(
      req.user!.id,
      data,
    );
    res.status(statusCode).json(payload);
  };

  list = async (req: Request, res: Response) => {
    const parsed = parseListMessagesQuery(
      String(req.params.conversationId),
      req.query as Record<string, unknown>,
    );
    const data = await messageService.list(req.user!.id, parsed.conversationId, {
      limit: parsed.limit,
      beforeId: parsed.beforeId,
      afterId: parsed.afterId,
    });
    res.json(data);
  };
}

export const messageController = new MessageController();
