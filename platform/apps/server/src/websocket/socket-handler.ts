import { WebSocket } from "ws";
import { newChatHandler } from "./handlers/new-chat-handler.js";
import { joinChatHandler } from "./handlers/join-chat-handler.js";
import { newQuestionHandler } from "./handlers/new-question-handler.js";
import { removeSocketFromAllChats } from "./chats-store.js";
import { db, eq, userWallet } from "@repo/db";

export const SocketHandler = async (socket: WebSocket) => {
  socket.onmessage = async (event) => {
    try {
      const parsedEvent = JSON.parse(event.data.toString());

      //TODO: remove this limit as the project grows
      const [userWalletRow] = await db
        .select()
        .from(userWallet)
        .where(eq(userWallet.user_id, socket.userId));
      if (!userWalletRow || userWalletRow?.balance <= 0) {
        socket.send(
          JSON.stringify({
            type: "error",
            data: {
              error:
                "Either you don't have enough balance or you are not logged in",
            },
          }),
        );
        return;
      }
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

  socket.onclose = () => {
    removeSocketFromAllChats(socket);
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
