import { WebSocket } from "ws";
export const SocketHandler = async (socket: WebSocket) => {
  socket.onmessage = (event) => {
    console.log(event.target, event.data);
  };
};
