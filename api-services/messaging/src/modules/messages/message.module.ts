import { Module } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { ConversationModule } from "../conversations/conversation.module";
import { WebsocketModule } from "../../websocket/websocket.module";
import { MessageController } from "./message.controller";
import { MessageService } from "./message.service";

@Module({
  imports: [AuthModule, ConversationModule, WebsocketModule],
  controllers: [MessageController],
  providers: [MessageService],
})
export class MessageModule {}
