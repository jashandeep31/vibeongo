import { chatAnswer, chatQuestions, chats, db } from "@repo/db";
import { z } from "zod";
import WebSocket from "ws";
import { AppError } from "../../lib/app-error.js";
import { projectAIAgent } from "../../ai/ai-agents/project-agent.js";
import { sendWSError } from "../socket-handler.js";

const STREAM_UPDATE_INTERVAL_MS = 300;

export const newChatHandler = async (socket: WebSocket, eventData: unknown) => {
  const userId = socket.userId;

  const parsingResponse = z
    .object({
      question: z.string().min(2).max(3000),
    })
    .safeParse(eventData);

  if (parsingResponse.error) {
    sendWSError(socket, "Validation failed");
    return;
  }

  const parsedData = parsingResponse.data;
  const chatId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({
        id: chatId,
        name: "unknown",
        user_id: userId,
        chat_agent: "project-handler",
      })
      .returning();

    if (!chat) throw new AppError("something went wrong", 500);
  });

  socket.send(
    JSON.stringify({
      type: "new-chat",
      data: {
        chatId,
      },
    }),
  );

  const newQuestion: typeof chatQuestions.$inferSelect = {
    id: crypto.randomUUID(),
    question: parsedData.question,
    order_number: 0,
    chat_id: chatId,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const newAnswer: typeof chatAnswer.$inferSelect = {
    id: crypto.randomUUID(),
    question_id: newQuestion.id,
    answer: "",
    memory: "",
    reasoning: "",
    steps: null,
    finish_reason: null,
    usage: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  let reasoning = "";
  let answer = "";
  let updatedConfig: unknown = null;
  let steps: unknown = null;
  let usage: unknown = null;
  let finishReason: string | null = null;
  let lastStreamUpdateAt = 0;

  const sendQuestionUpdate = () => {
    lastStreamUpdateAt = Date.now();
    socket.send(
      JSON.stringify({
        type: "stream-question",
        data: {
          ...newQuestion,
          answer: {
            ...newAnswer,
            answer,
            reasoning,
            memory: updatedConfig === null ? "" : JSON.stringify(updatedConfig),
            steps,
            usage,
            finish_reason: finishReason,
          },
        },
      }),
    );
  };

  const sendThrottledQuestionUpdate = () => {
    const now = Date.now();
    if (now - lastStreamUpdateAt < STREAM_UPDATE_INTERVAL_MS) return;

    sendQuestionUpdate();
  };

  sendQuestionUpdate();

  for await (const res of projectAIAgent({
    query: parsedData.question,
    userId,
    prevConfig: "",
    QAs: [],
  })) {
    answer += res.text;
    reasoning += res.reasoning;
    if (res.updatedConfig) {
      updatedConfig = res.updatedConfig;
    }
    if (res.steps) {
      steps = res.steps;
    }
    if (res.usage) {
      usage = res.usage;
    }
    if (res.finish_reason) {
      finishReason = res.finish_reason;
    }
    sendThrottledQuestionUpdate();
  }

  sendQuestionUpdate();

  const persistedQuestion = {
    ...newQuestion,
  };

  await db.transaction(async (tx) => {
    await tx.insert(chatQuestions).values(persistedQuestion);
    await tx.insert(chatAnswer).values({
      ...newAnswer,
      reasoning,
      answer,
      memory: updatedConfig === null ? "" : JSON.stringify(updatedConfig),
      steps,
      usage,
      finish_reason: finishReason,
    });
  });

  socket.send(
    JSON.stringify({
      type: "new-question",
      data: {
        ...persistedQuestion,
        answer: {
          ...newAnswer,
          answer,
          reasoning,
          memory: updatedConfig === null ? "" : JSON.stringify(updatedConfig),
          steps,
          usage,
          finish_reason: finishReason,
        },
      },
    }),
  );
};
