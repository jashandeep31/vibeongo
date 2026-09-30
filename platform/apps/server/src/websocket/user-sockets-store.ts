import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import {
  markSocketOffline,
  markSocketOnline,
  markSocketsOnline,
} from "./user-presence.js";

// all open sockets of a user, used to deliver notifications in realtime
const userSockets = new Map<string, Set<WebSocket>>();

export const addUserSocket = (socket: WebSocket) => {
  socket.socketId = randomUUID();
  const sockets = userSockets.get(socket.userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  userSockets.set(socket.userId, sockets);

  markSocketOnline(socket.userId, socket.socketId).catch((error) => {
    console.error("Could not mark socket online", error);
  });
};

export const removeUserSocket = (socket: WebSocket) => {
  const sockets = userSockets.get(socket.userId);
  if (!sockets) return;

  sockets.delete(socket);
  if (!sockets.size) {
    userSockets.delete(socket.userId);
  }

  markSocketOffline(socket.userId, socket.socketId).catch((error) => {
    console.error("Could not mark socket offline", error);
  });
};

// called on every heartbeat so live sockets stay marked online
export const refreshUserSocketsPresence = async () => {
  const sockets: Array<{ userId: string; socketId: string }> = [];
  for (const [userId, userSocketSet] of userSockets) {
    for (const socket of userSocketSet) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      sockets.push({ userId, socketId: socket.socketId });
    }
  }
  await markSocketsOnline(sockets);
};

// returns the number of sockets the message was sent to
export const sendToUser = (userId: string, message: unknown) => {
  const sockets = userSockets.get(userId);
  if (!sockets) return 0;

  const payload = JSON.stringify(message);
  let sent = 0;
  for (const socket of sockets) {
    if (socket.readyState !== WebSocket.OPEN) continue;
    socket.send(payload);
    sent++;
  }
  return sent;
};
