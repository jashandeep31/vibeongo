import { ModelMessage, stepCountIs, streamText, tool } from "ai";
import WebSocket from "ws";
import { z } from "zod";
import {
  getOtherProjectConfigById,
  createNewGithubRepo,
  getAllProjectNameAndIds,
  getInstanceCatalogAITool,
  getUserReposAITool,
  getUserSshKeysAITool,
  createAndSaveProjectTool,
  updateProjectByIdTool,
} from "../../ai/ai-tools/project-ai-tools.js";
import { projectValidatorForAIInput } from "@repo/shared";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";
import { prompts } from "../../ai/prompts/index.js";
import { projectAIAgent } from "../../ai/ai-agents/project-agent.js";

type QuesitonWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};

export const newQuestionHandler = async (
  socket: WebSocket,
  rawData: unknown,
) => {
  const userId = socket.userId;
  const parsingResponse = z
    .object({
      chatId: z.uuid(),
      question: z.string().min(2).max(3000),
    })
    .safeParse(rawData);

  if (parsingResponse.error) {
    sendWSError(socket, "Validation failed");
    return;
  }

  const parsedResponse = parsingResponse.data;

  //TODO: make it redis/valkey based q/a fetching
  //
  const questionAndAnswerRows = await db
    .select()
    .from(chatQuestions)
    .leftJoin(chatAnswer, eq(chatAnswer.question_id, chatQuestions.id))
    .where(eq(chatQuestions.chat_id, parsedResponse.chatId))
    .limit(5);
  const refinedQAMap = new Map<
    string,
    typeof chatQuestions.$inferSelect & {
      chatAnswer: typeof chatAnswer.$inferSelect | null;
    }
  >();

  for (const item of questionAndAnswerRows) {
    if (item.chat_questions && !refinedQAMap.has(item.chat_questions.id)) {
      refinedQAMap.set(item.chat_questions.id, {
        ...item.chat_questions,
        chatAnswer: null,
      });
    }
    if (item.chat_answer) {
      const prev = refinedQAMap.get(item.chat_answer.question_id);
      if (prev)
        refinedQAMap.set(prev.id, {
          ...prev,
          chatAnswer: item.chat_answer,
        });
    }
  }

  const refinedQA = Array.from(refinedQAMap.values());

  const [lastQuestionAndAnswer] = await db
    .select({
      question: chatQuestions,
      answer: chatAnswer,
    })
    .from(chatQuestions)
    .innerJoin(
      chats,
      and(eq(chats.user_id, userId), eq(chats.id, parsedResponse.chatId)),
    )
    .leftJoin(chatAnswer, eq(chatAnswer.question_id, chatQuestions.id))
    .where(and(eq(chatQuestions.chat_id, parsedResponse.chatId)))
    .orderBy(desc(chatQuestions.order_number));

  if (!lastQuestionAndAnswer?.question) {
    sendWSError(socket, "Somehting went wrong");
    return;
  }

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

  const sendQuestionUpdate = () => {
    socket.send(
      JSON.stringify({
        type: "stream-question",
        data: {
          ...newQuestion,
          answer: {
            ...newAnswer,
            answer,
            reasoning,
          },
        },
      }),
    );
  };

  sendQuestionUpdate();

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
    sendQuestionUpdate();
  }

  const persistedQuestion = {
    ...newQuestion,
  };

  await db.transaction(async (tx) => {
    await tx.insert(chatQuestions).values(persistedQuestion);
    await tx.insert(chatAnswer).values({
      ...newAnswer,
      reasoning: reasoning,
      answer: answer,
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
        },
      },
    }),
  );
};
