import { WebSocket } from "ws";
import { newChatHandler } from "./handlers/newchat-handler.js";

export const SocketHandler = async (socket: WebSocket) => {
  socket.onmessage = async (event) => {
    const parsedEvent = JSON.parse(event.data.toString());
    console.log(parsedEvent.type);
    switch (parsedEvent.type) {
      case "get-chat":
        console.log("someone is looking for the chat");
        break;
      case "new-chat":
        console.log("i wanna create the chat");
        await newChatHandler(socket, parsedEvent.data);
        break;
    }
  };
};
