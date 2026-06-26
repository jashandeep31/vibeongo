import { stepCountIs, streamText, tool } from "ai";
import WebSocket from "ws";
import { z } from "zod";
import {
  createNewGithubRepo,
  getInstanceCatalogAITool,
  getUserReposAITool,
  getUserSshKeysAITool,
} from "../../ai/ai-tools/project-ai-tools.js";
import { projectValidatorForAIInput } from "@repo/shared";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";
import { prompts } from "../../ai/prompts/index.js";

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
    memory: "",
    created_at: new Date(),
    updated_at: new Date(),
  };

  const newAnswer: typeof chatAnswer.$inferSelect = {
    id: crypto.randomUUID(),
    question_id: newQuestion.id,
    answer: "",
    reasoning: "",
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

  for await (const res of aiWork(
    parsedResponse.question,
    userId,
    lastQuestionAndAnswer.question.memory,
  )) {
    answer += res.text;
    reasoning += res.reasoning;
    if (res.config) {
      updatedConfig = res.config;
    }
    sendQuestionUpdate();
  }

  const persistedQuestion = {
    ...newQuestion,
    memory: updatedConfig
      ? JSON.stringify(updatedConfig)
      : lastQuestionAndAnswer.question.memory,
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

const updateConfig = tool({
  description: "Update the config with the user given data",
  inputSchema: projectValidatorForAIInput.extend({}),
  execute: async (data: unknown) => {
    const valid = projectValidatorForAIInput.parse(data);
    return valid;
  },
});

const getCurrentConfig = (config: unknown) =>
  tool({
    description: "Get the current to read check what we already have",
    inputSchema: z.object(),
    execute: async () => {
      if (!config) return {};
      if (typeof config !== "string") return config;
      try {
        return JSON.parse(config);
      } catch {
        return {};
      }
    },
  });

async function* aiWork(
  question: string,
  userId: string,
  prevConig: unknown,
): AsyncGenerator<{
  done: boolean;
  text: string;
  config: unknown;
  reasoning: string;
}> {
  const result = streamText({
    model: "openai/gpt-5-nano",
    system: prompts.createProject.systemPrompt(),
    tools: {
      // weatherTool,
      getUserReposAITool: getUserReposAITool(userId),
      getUserSshKeysAITool: getUserSshKeysAITool(userId),
      getInstanceCatalogAITool: getInstanceCatalogAITool(),
      getCurrentConfig: getCurrentConfig(prevConig),
      updateConfig,
      createNewGithubRepo: createNewGithubRepo(userId),
    },
    stopWhen: stepCountIs(20),
    prompt: question,
    // toolChoice: { type: "tool", toolName: "updateConfig" },
  });

  let updatedConfig = null;
  let reasoning = "";
  for await (const chunk of result.stream) {
    if (chunk.type === "reasoning-delta") {
      reasoning += chunk.text;
      yield {
        reasoning: chunk.text,
        text: "",
        config: null,
        done: false,
      };
    }

    if (chunk.type === "text-delta") {
      yield {
        reasoning: "",
        text: chunk.text,
        config: null,
        done: false,
      };
    }
  }

  const steps = await result.steps;
  for (const step of steps) {
    for (const tool of step.toolResults) {
      if (tool.type == "tool-result") {
        if (tool.toolName === "updateConfig") {
          updatedConfig = tool.output;
        }
      }
    }
  }
  yield {
    done: true,
    text: "",
    config: updatedConfig,
    reasoning: "",
  };
}
