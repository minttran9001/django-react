import http from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { attachChatGateway } from "./websocket/chat.gateway.js";

const app = createApp();
const server = http.createServer(app);

attachChatGateway(server);

server.listen(env.PORT, () => {
  console.log(`Messaging service listening on http://localhost:${env.PORT}`);
  console.log(`WebSocket: ws://localhost:${env.PORT}/ws/chat/`);
});
