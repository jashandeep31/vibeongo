import { and, chatAnswer, chatQuestions, chats, db, eq } from "@repo/db";
import WebSocket from "ws";
import { z } from "zod";
import { sendWSError } from "../socket-handler.js";

export const joinChatHandler = async (socket: WebSocket, data: unknown) => {
  const userId = socket.userId;
  const parsingDataResponse = z.object({ id: z.uuid() }).safeParse(data);
  if (parsingDataResponse.error) {
    sendWSError(socket, "not a valid id ");
    return;
  }
  const parsedData = parsingDataResponse.data;

  const rows = await db
    .select()
    .from(chats)
    .leftJoin(chatQuestions, eq(chatQuestions.chat_id, chats.id))
    .leftJoin(chatAnswer, eq(chatAnswer.question_id, chatQuestions.id))
    .where(and(eq(chats.user_id, userId), eq(chats.id, parsedData.id)))
    .orderBy(chatQuestions.order_number);

  if (!rows.length) {
    socket.send(
      JSON.stringify({
        type: "chat-data",
        data: { rows: { chat: null, chatQuestions: [] } },
      }),
    );
    return;
  }

  const refinedQuestions = new Map<
    string,
    typeof chatQuestions.$inferSelect & {
      chatAnswer: typeof chatAnswer.$inferSelect | null;
    }
  >();

  for (const item of rows) {
    if (item.chat_questions && !refinedQuestions.has(item.chat_questions.id)) {
      refinedQuestions.set(item.chat_questions.id, {
        ...item.chat_questions,
        chatAnswer: null,
      });
    }
    if (item.chat_answer) {
      const prev = refinedQuestions.get(item.chat_answer.question_id);
      if (prev)
        refinedQuestions.set(prev.id, {
          ...prev,
          chatAnswer: item.chat_answer,
        });
    }
  }

  socket.send(
    JSON.stringify({
      type: "chat-data",
      data: {
        chat: rows[0]?.chats!,
        chatQuestions: Array.from(refinedQuestions.values()),
      },
    }),
  );
};
