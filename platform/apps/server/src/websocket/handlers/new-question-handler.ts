import WebSocket from "ws";
import { z } from "zod";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";
import { projectAIAgent } from "../../ai/ai-agents/project-agent.js";
import {
  addSubscriber,
  broadcastToChat,
  clearActiveStream,
  setActiveStream,
} from "../chats-store.js";

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
  const questionAndAnswerRows = await db
    .select()
    .from(chatQuestions)
    .leftJoin(chatAnswer, eq(chatAnswer.question_id, chatQuestions.id))
    .where(eq(chatQuestions.chat_id, parsedResponse.chatId))
    .limit(10);
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

  addSubscriber(parsedResponse.chatId, socket);

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
    setActiveStream(parsedResponse.chatId, getStreamingQuestion());
  };

  const sendQuestionStarted = () => {
    const streamQuestion = getStreamingQuestion();

    setActiveStream(parsedResponse.chatId, streamQuestion);
    broadcastToChat(parsedResponse.chatId, {
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
      chatId: parsedResponse.chatId,
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

    broadcastToChat(parsedResponse.chatId, {
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
      query: parsedResponse.question,
      userId,
      prevConfig: lastQuestionAndAnswer.answer?.memory || "",
      QAs: refinedQA,
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
        reasoning: reasoning,
        answer: answer,
        memory: getAnswerMemory(),
        steps,
        usage,
        finish_reason: finishReason,
      });
    });

    broadcastToChat(parsedResponse.chatId, {
      type: "new-question",
      data: getFinalQuestion(),
    });
    clearActiveStream(parsedResponse.chatId);
  } catch (error) {
    clearActiveStream(parsedResponse.chatId);
    throw error;
  }
};
