import WebSocket from "ws";

// all open sockets of a user, used to deliver notifications in realtime
const userSockets = new Map<string, Set<WebSocket>>();

export const addUserSocket = (socket: WebSocket) => {
  const sockets = userSockets.get(socket.userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  userSockets.set(socket.userId, sockets);
};

export const removeUserSocket = (socket: WebSocket) => {
  const sockets = userSockets.get(socket.userId);
  if (!sockets) return;

  sockets.delete(socket);
  if (!sockets.size) {
    userSockets.delete(socket.userId);
  }
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
