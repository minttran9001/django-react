import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health.controller";
import { ConversationModule } from "./modules/conversations/conversation.module";
import { MessageModule } from "./modules/messages/message.module";
import { PrismaModule } from "./prisma/prisma.module";
import { WebsocketModule } from "./websocket/websocket.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WebsocketModule,
    ConversationModule,
    MessageModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
