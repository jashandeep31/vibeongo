import WebSocket from "ws";

declare module "ws" {
  interface WebSocket {
    userId: string;
    isAlive: boolean;
    // set once the socket is registered for the user (user-sockets-store)
    socketId: string;
  }
}
