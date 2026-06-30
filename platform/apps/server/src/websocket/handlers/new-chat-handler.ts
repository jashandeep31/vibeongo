import { chatAnswer, chatQuestions, chats, db } from "@repo/db";
import { z } from "zod";
import WebSocket from "ws";
import { AppError } from "../../lib/app-error.js";
import { projectAIAgent } from "../../ai/ai-agents/project-agent.js";
import {
  addSubscriber,
  broadcastToChat,
  clearActiveStream,
  setActiveStream,
} from "../chats-store.js";
import { sendWSError } from "../socket-handler.js";

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

  addSubscriber(chatId, socket);

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

  const getAnswerMemory = () =>
    updatedConfig === null ? "" : JSON.stringify(updatedConfig);

  const getStreamingQuestion = () => ({
    ...newQuestion,
    answer: {
      ...newAnswer,
      answer,
      reasoning,
      memory: getAnswerMemory(),
      steps,
      usage,
      finish_reason: finishReason,
    },
  });

  const updateActiveStream = () => {
    setActiveStream(chatId, getStreamingQuestion());
  };

  const sendQuestionStarted = () => {
    const streamQuestion = getStreamingQuestion();

    setActiveStream(chatId, streamQuestion);
    broadcastToChat(chatId, {
      type: "stream-question-started",
      data: streamQuestion,
    });
  };

  const sendAnswerDelta = (res: {
    text: string;
    reasoning: string;
    updatedConfig?: unknown;
    steps?: unknown;
    usage?: unknown;
    finish_reason?: string | null;
  }) => {
    const delta: {
      chatId: string;
      questionId: string;
      answerId: string;
      answerDelta: string;
      reasoningDelta: string;
      memory?: string;
      steps?: unknown;
      usage?: unknown;
      finishReason?: string | null;
    } = {
      chatId,
      questionId: newQuestion.id,
      answerId: newAnswer.id,
      answerDelta: res.text,
      reasoningDelta: res.reasoning,
    };

    if (res.updatedConfig) {
      delta.memory = JSON.stringify(res.updatedConfig);
    }
    if (res.steps) {
      delta.steps = res.steps;
    }
    if (res.usage) {
      delta.usage = res.usage;
    }
    if (res.finish_reason) {
      delta.finishReason = res.finish_reason;
    }

    broadcastToChat(chatId, {
      type: "answer-delta",
      data: delta,
    });
  };

  const getFinalQuestion = () => ({
    ...newQuestion,
    answer: {
      ...newAnswer,
      answer,
      reasoning,
      memory: getAnswerMemory(),
      steps,
      usage,
      finish_reason: finishReason,
    },
  });

  try {
    sendQuestionStarted();

    for await (const res of projectAIAgent({
      query: parsedData.question,
      userId,
      prevConfig: "",
      QAs: [],
    })) {
      const answerDelta = res.text ?? "";
      const reasoningDelta = res.reasoning ?? "";
      answer += answerDelta;
      reasoning += reasoningDelta;
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

      updateActiveStream();
      sendAnswerDelta({
        text: answerDelta,
        reasoning: reasoningDelta,
        updatedConfig: res.updatedConfig,
        steps: res.steps,
        usage: res.usage,
        finish_reason: res.finish_reason,
      });
    }

    updateActiveStream();

    const persistedQuestion = {
      ...newQuestion,
    };

    await db.transaction(async (tx) => {
      await tx.insert(chatQuestions).values(persistedQuestion);
      await tx.insert(chatAnswer).values({
        ...newAnswer,
        reasoning,
        answer,
        memory: getAnswerMemory(),
        steps,
        usage,
        finish_reason: finishReason,
      });
    });

    broadcastToChat(chatId, {
      type: "new-question",
      data: getFinalQuestion(),
    });
    clearActiveStream(chatId);
  } catch (error) {
    clearActiveStream(chatId);
    throw error;
  }
};
