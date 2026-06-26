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
  const { response, reasoning, updatedConfig } = await aiWork(
    parsedData.question,
    socket.userId,
  );
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
        memory: updatedConfig
          ? JSON.stringify(updatedConfig)
          : JSON.stringify({}),
        order_number: 0,
      })
      .returning();

    if (!chatQuestion) throw new AppError("something went wrong ", 500);

    await tx.insert(chatAnswer).values({
      question_id: chatQuestion.id,
      answer: response,
      reasoning,
    });
    return { chat, chatQuestion };
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

const getCurrentConfig = tool({
  description: "Get the current to read check what we already have",
  inputSchema: z.object(),
  execute: async () => {
    return {
      githubRepoIds: [],
      sshKeyIds: [],
    };
  },
});

const aiWork = async (question: string, userId: string) => {
  const result = await generateText({
    model: "openai/gpt-5-nano",
    system: prompts.createProject.systemPrompt(),
    tools: {
      // weatherTool,
      getUserReposAITool: getUserReposAITool(userId),
      getUserSshKeysAITool: getUserSshKeysAITool(userId),
      getInstanceCatalogAITool: getInstanceCatalogAITool(),
      getCurrentConfig,
      updateConfig,
      createNewGithubRepo: createNewGithubRepo(userId),
    },
    stopWhen: stepCountIs(5),
    prompt: question,
    // toolChoice: { type: "tool", toolName: "updateConfig" },
  });

  let response = "";
  let reasoning = "";
  let updatedConfig = null;

  for (const contentPart of result.content) {
    if (contentPart.type === "text") {
      response += contentPart.text;
    }
    if (contentPart.type === "reasoning") {
      reasoning += contentPart.text;
    }
    if (contentPart.type === "tool-result") {
      const toolUsed = contentPart;
      if (toolUsed.toolName === "updateConfig") {
        updatedConfig = toolUsed.output;
      }
    }
  }
  console.log(result);
  console.log(response);
  return { response, reasoning, updatedConfig };
};
