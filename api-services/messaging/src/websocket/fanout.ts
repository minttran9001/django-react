import { Injectable } from "@nestjs/common";
import type { WebSocket } from "ws";

/** In-memory fan-out keyed by user id (single process). */
@Injectable()
export class FanoutService {
  private readonly userSockets = new Map<number, Set<WebSocket>>();

  addUserSocket(userId: number, socket: WebSocket) {
    let set = this.userSockets.get(userId);
    if (!set) {
      set = new Set();
      this.userSockets.set(userId, set);
    }
    set.add(socket);
  }

  removeUserSocket(userId: number, socket: WebSocket) {
    const set = this.userSockets.get(userId);
    if (!set) return;
    set.delete(socket);
    if (set.size === 0) this.userSockets.delete(userId);
  }

  fanoutToUsers(userIds: number[], payload: unknown) {
    const data = JSON.stringify(payload);
    for (const userId of userIds) {
      const set = this.userSockets.get(userId);
      if (!set) continue;
      for (const socket of set) {
        if (socket.readyState === socket.OPEN) {
          socket.send(data);
        }
      }
    }
  }
}
