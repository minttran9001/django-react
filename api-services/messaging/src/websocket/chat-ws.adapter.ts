import http from "node:http";
import type { Duplex } from "node:stream";
import { WsAdapter } from "@nestjs/platform-ws";

type WsServerWithPath = {
  path: string;
  handleUpgrade: (
    request: http.IncomingMessage,
    socket: Duplex,
    head: Buffer,
    callback: (ws: unknown) => void,
  ) => void;
  emit: (
    event: "connection",
    ws: unknown,
    request: http.IncomingMessage,
  ) => boolean;
};

/**
 * Nest matches the upgrade URL exactly. The chat client connects to
 * `/ws/chat/`, so trailing slashes are ignored when choosing a gateway.
 */
export class ChatWsAdapter extends WsAdapter {
  protected override ensureHttpServerExists(
    port: number,
    httpServer = http.createServer(),
  ) {
    const registry = this.httpServersRegistry as Map<number, http.Server>;
    if (registry.has(port)) {
      return;
    }
    registry.set(port, httpServer);

    httpServer.on("upgrade", (request, socket, head) => {
      try {
        const baseUrl = "ws://" + request.headers.host + "/";
        const pathname =
          new URL(request.url ?? "/", baseUrl).pathname.replace(/\/+$/, "") ||
          "/";
        const servers = (
          this.wsServersRegistry as Map<number, WsServerWithPath[]>
        ).get(port);

        let delegated = false;
        for (const wsServer of servers ?? []) {
          const serverPath = wsServer.path.replace(/\/+$/, "") || "/";
          if (pathname === serverPath) {
            wsServer.handleUpgrade(request, socket, head, (ws) => {
              wsServer.emit("connection", ws, request);
            });
            delegated = true;
            break;
          }
        }
        if (!delegated) {
          socket.destroy();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Bad Request";
        socket.end("HTTP/1.1 400\r\n" + message);
      }
    });

    return httpServer;
  }
}
