import WebSocket from "ws";
import { z } from "zod";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";
import { projectAIAgent } from "../../ai/ai-agents/project-agent.js";

const STREAM_UPDATE_INTERVAL_MS = 300;

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
      reasoning: reasoning,
      answer: answer,
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
