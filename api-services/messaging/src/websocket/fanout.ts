import type { WebSocket } from "ws";

/** In-memory fan-out keyed by user id (single process). */
const userSockets = new Map<number, Set<WebSocket>>();

export function addUserSocket(userId: number, socket: WebSocket) {
  let set = userSockets.get(userId);
  if (!set) {
    set = new Set();
    userSockets.set(userId, set);
  }
  set.add(socket);
}

export function removeUserSocket(userId: number, socket: WebSocket) {
  const set = userSockets.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) userSockets.delete(userId);
}

export function fanoutToUsers(userIds: number[], payload: unknown) {
  const data = JSON.stringify(payload);
  for (const userId of userIds) {
    const set = userSockets.get(userId);
    if (!set) continue;
    for (const socket of set) {
      if (socket.readyState === socket.OPEN) {
        socket.send(data);
      }
    }
  }
}
