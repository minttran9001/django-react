import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ChatGateway } from "./chat.gateway";
import { FanoutService } from "./fanout";

@Module({
  imports: [AuthModule],
  providers: [FanoutService, ChatGateway],
  exports: [FanoutService],
})
export class WebsocketModule {}
