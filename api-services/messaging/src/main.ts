import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import { json } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { env } from "./config/env";
import { ChatWsAdapter } from "./websocket/chat-ws.adapter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(cookieParser());
  app.use(json({ limit: "1mb" }));
  app.enableCors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });
  app.setGlobalPrefix("api", {
    exclude: [{ path: "health", method: RequestMethod.GET }],
  });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useWebSocketAdapter(new ChatWsAdapter(app));

  await app.listen(env.PORT);
  console.log(`Messaging service listening on http://localhost:${env.PORT}`);
  console.log(`WebSocket: ws://localhost:${env.PORT}/ws/chat/`);
}

void bootstrap();
