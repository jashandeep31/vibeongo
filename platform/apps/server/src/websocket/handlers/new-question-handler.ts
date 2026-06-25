import { generateText, stepCountIs, tool } from "ai";
import WebSocket from "ws";
import { z } from "zod";
import {
  createNewGithubRepo,
  getUserReposAITool,
} from "../../ai/ai-tools/repo-tools.js";
import { projectValidatorForAIInput } from "@repo/shared";
import { sendWSError } from "../socket-handler.js";
import { and, chatAnswer, chatQuestions, chats, db, desc, eq } from "@repo/db";

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
  const newQuestionId = crypto.randomUUID();
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
  const { response, updatedConfig } = await aiWork(
    parsedResponse.question,
    userId,
    lastQuestionAndAnswer.question.memory,
  );

  await db.transaction(async (tx) => {
    await tx.insert(chatQuestions).values({
      id: newQuestionId,
      question: parsedResponse.question,
      order_number: lastQuestionAndAnswer.question.order_number + 1,
      chat_id: parsedResponse.chatId,
      memory: JSON.stringify(updatedConfig),
    });
    await tx.insert(chatAnswer).values({
      answer: response,
      question_id: newQuestionId,
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
      return JSON.parse(config as any);
    },
  });

const aiWork = async (question: string, userId: string, prevConig: unknown) => {
  const result = await generateText({
    model: "openai/gpt-5-nano",
    system:
      "You are a expert vibeongo project config maker. You can ask the question regading that as needed and can use the internal tools for it. You have ask user to for each tthing as the user want so do me your own Your motive is compelte the config you can ask user next queistons  , if config is not rpooerp you can getprev config fomthe getCurrentConfig toll and after adding new thigns those areginven i nte thsi pronpt call updateConfig then asked the user  quesions about missign thisns",
    tools: {
      // weatherTool,
      getUserReposAITool: getUserReposAITool(userId),
      getCurrentConfig: getCurrentConfig(prevConig),
      updateConfig,
      createNewGithubRepo: createNewGithubRepo(userId),
    },
    stopWhen: stepCountIs(2),
    prompt: question,
    // toolChoice: { type: "tool", toolName: "updateConfig" },
  });

  let response = "";
  let updatedConfig = null;

  for (const contentPart of result.content) {
    if (contentPart.type === "text") {
      response += contentPart.text;
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
  return { response, updatedConfig };
};
