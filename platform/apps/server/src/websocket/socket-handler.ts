import { WebSocket } from "ws";
import { newChatHandler } from "./handlers/new-chat-handler.js";
import { joinChatHandler } from "./handlers/join-chat-handler.js";
import { newQuestionHandler } from "./handlers/new-question-handler.js";

export const SocketHandler = async (socket: WebSocket) => {
  //NOTE:
  //Current method of sending the live chats data is not the best method we are currently emmeting the full question data again and again
  //Instead we should be sending the chunks data only
  //For that we need to build a local tracking system which can handle the chat rejoin in the better way
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
