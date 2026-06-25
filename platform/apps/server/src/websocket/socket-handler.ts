import { WebSocket } from "ws";
import { newChatHandler } from "./handlers/newchat-handler.js";
import { joinChatHandler } from "./handlers/join-chat-handler.js";

export const SocketHandler = async (socket: WebSocket) => {
  socket.onmessage = async (event) => {
    const parsedEvent = JSON.parse(event.data.toString());
    console.log(parsedEvent.type);
    switch (parsedEvent.type) {
      case "join-chat":
        await joinChatHandler(socket, parsedEvent.data);
        break;
      case "new-chat":
        console.log("i wanna create the chat");
        await newChatHandler(socket, parsedEvent.data);
        break;
    }
  };
};

export const sendWSError = (socket: WebSocket, error: string) => {
  socket.send(
    JSON.stringify({
      type: "error",
      error,
    }),
  );
  return;
};
