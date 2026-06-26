import { stepCountIs, streamText, tool } from "ai";
import WebSocket from "ws";
import { z } from "zod";
import {
  createNewGithubRepo,
  getInstanceCatalogAITool,
  getUserReposAITool,
  getUserSshKeysAITool,
} from "../../ai/ai-tools/repo-tools.js";
import { projectValidatorForAIInput } from "@repo/shared";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";

const projectConfigSystemPrompt = `You are an expert Vibeongo project config assistant.
Your goal is to collect enough information to build a valid project config.
Use getCurrentConfig first when continuing an existing chat so you preserve previous choices.
Use getUserReposAITool to show/select existing GitHub repositories. If the user gives a new GitHub repo URL, use createNewGithubRepo before adding it to the config.
Use getUserSshKeysAITool to show/select SSH keys. The selected IDs must be written to sshKeyIds.
Use getInstanceCatalogAITool to show available regions and instance types. The selected IDs must be written to regionId and instanceTypeId.
When the user provides or confirms config values, call updateConfig with the complete current config using these fields: name, description, regionId, instanceTypeId, sshKeyIds, githubRepoIds, initialScript, finalScript, and devScript.
Ask concise follow-up questions only for missing required values or unclear choices.`;

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

  socket.send(
    JSON.stringify({
      type: "new-question",
      data: {
        ...newQuestion,
        answer: newAnswer,
      },
    }),
  );

  let reasoning = "";
  let answer = "";
  let updatedConfig: unknown = null;
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
    socket.send(
      JSON.stringify({
        type: "answer-update",
        data: {
          ...newAnswer,
          answer: answer,
          reasoning: reasoning,
        },
      }),
    );
  }

  await db.transaction(async (tx) => {
    await tx.insert(chatQuestions).values({
      ...newQuestion,
      memory: updatedConfig
        ? JSON.stringify(updatedConfig)
        : lastQuestionAndAnswer.question.memory,
    });
    await tx.insert(chatAnswer).values({
      ...newAnswer,
      reasoning: reasoning,
      answer: answer,
    });
  });
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
    system: projectConfigSystemPrompt,
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

  let response = "";
  let updatedConfig = null;
  let done = false;
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
  for await (const text of result.textStream) {
    response += text;
    yield {
      done,
      text: text,
      config: updatedConfig,
      reasoning,
    };
  }
  const steps = await result.steps;
  //
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
