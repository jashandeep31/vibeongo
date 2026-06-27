import { chatAnswer, chatQuestions, chats, db } from "@repo/db";
import { z } from "zod";
import { WebSocket } from "ws";
import { AppError } from "../../lib/app-error.js";
import { generateText, stepCountIs, tool } from "ai";
import { projectValidatorForAIInput } from "@repo/shared";
import {
  createNewGithubRepo,
  getInstanceCatalogAITool,
  getUserReposAITool,
  getUserSshKeysAITool,
} from "../../ai/ai-tools/project-ai-tools.js";
import { prompts } from "../../ai/prompts/index.js";

export const newChatHandler = async (socket: WebSocket, eventData: unknown) => {
  const userId = socket.userId;

  const parsedData = z
    .object({
      question: z.string().min(3).max(3000),
    })
    .parse(eventData);

  const [chatId, chatQuestionId] = [crypto.randomUUID(), crypto.randomUUID()];

  socket.send(
    JSON.stringify({
      type: "new-chat",
      data: {
        chatId: chatId,
      },
    }),
  );
  // const { response, reasoning, updatedConfig } = await aiWork(
  //   parsedData.question,
  //   socket.userId,
  // );
  //

  const newQuestion: typeof chatQuestions.$inferSelect = {
    id: crypto.randomUUID(),
    question: parsedResponse.question,
    order_number: lastQuestionAndAnswer.question.order_number + 1,
    chat_id: parsedResponse.chatId,
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

  for await (const res of projectAIAgent({
    query: parsedResponse.question,
    userId,
    prevConfig: lastQuestionAndAnswer.answer?.memory || "",
    QAs: refinedQA,
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
    sendQuestionUpdate();
  }

  const persistedQuestion = {
    ...newQuestion,
  };
  // create the chat for user
  await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({
        id: chatId,
        name: "unknown",
        user_id: userId,
      })
      .returning();
    if (!chat) throw new AppError("something went wrong", 500);
    const [chatQuestion] = await tx
      .insert(chatQuestions)
      .values({
        id: chatQuestionId,
        chat_id: chat.id,
        question: parsedData.question,
        order_number: 0,
      })
      .returning();

    if (!chatQuestion) throw new AppError("something went wrong ", 500);

    // await tx.insert(chatAnswer).values({
    //   question_id: chatQuestion.id,
    //   answer: response,
    //   reasoning,
    // });
    return { chat, chatQuestion };
  });
};
