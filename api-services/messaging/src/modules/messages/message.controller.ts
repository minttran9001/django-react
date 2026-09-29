import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { AuthGuard } from "../../auth/auth.guard";
import { CurrentUser } from "../../auth/current-user.decorator";
import type { AuthUser } from "../../auth/auth.service";
import { MessageService } from "./message.service";
import {
  parseListMessagesQuery,
  parseSendMessageBody,
} from "./message.validators";
import { ListMessagesQuery } from "src/common/types/message";
import { SendMessageBody } from "./message.types";

@Controller("messages")
@UseGuards(AuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post("send")
  async send(
    @CurrentUser() user: AuthUser,
    @Body() body: SendMessageBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = parseSendMessageBody(body, user.id);
    const { payload, statusCode } = await this.messageService.send(
      user.id,
      data,
    );
    res.status(statusCode);
    return payload;
  }

  @Get(":conversationId")
  list(
    @CurrentUser() user: AuthUser,
    @Param("conversationId") conversationId: string,
    @Query() query: ListMessagesQuery,
  ) {
    const parsed = parseListMessagesQuery(conversationId, query);
    return this.messageService.list(user.id, parsed.conversationId, {
      limit: parsed.limit,
      beforeId: parsed.beforeId,
      afterId: parsed.afterId,
    });
  }
}
