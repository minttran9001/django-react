import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { ConversationService } from "./conversation.service";
import { parseDmUserId, parseSeenBody } from "./conversation.validators";
import { GetDirectConversationQuery } from "src/common/types/conversation";

@Controller("conversations")
@UseGuards(AuthGuard)
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.conversationService.listForUser(user.id);
  }

  @Get("dm")
  getDirect(
    @CurrentUser() user: AuthUser,
    @Query() query: GetDirectConversationQuery,
  ) {
    const peerUserId = parseDmUserId(query.userId ?? query.user_id);
    return this.conversationService.findDirect(user.id, peerUserId);
  }

  @Post(":conversationId/seen")
  @HttpCode(200)
  async markSeen(
    @CurrentUser() user: AuthUser,
    @Param("conversationId") conversationId: string,
    @Body() body: Record<string, unknown> | undefined,
    @Res() res: Response,
  ) {
    const parsed = parseSeenBody(conversationId, body);
    await this.conversationService.persistSeenWatermark(
      user.id,
      parsed.conversationId,
      parsed.createdAt,
      parsed.clientId,
    );
    res.status(200).end();
  }
}
