import { WebSocket } from "ws";
import { newChatHandler } from "./handlers/newchat-handler.js";
import { joinChatHandler } from "./handlers/join-chat-handler.js";
import { newQuestionHandler } from "./handlers/new-question-handler.js";

export const SocketHandler = async (socket: WebSocket) => {
  socket.onmessage = async (event) => {
    try {
      const parsedEvent = JSON.parse(event.data.toString());
      switch (parsedEvent.type) {
        case "join-chat":
          await joinChatHandler(socket, parsedEvent.data);
          break;
        case "new-chat":
          console.log("i wanna create the chat");
          await newChatHandler(socket, parsedEvent.data);
          break;
        case "new-question":
          await newQuestionHandler(socket, parsedEvent.data);
          break;
      }
    } catch (error) {
      console.error("WebSocket message handler error:", error);
      sendWSError(
        socket,
        error instanceof Error ? error.message : "Invalid websocket message",
      );
    }
  };
};

export const sendWSError = (socket: WebSocket, error: string) => {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(
    JSON.stringify({
      type: "error",
      error,
    }),
  );
  return;
};
