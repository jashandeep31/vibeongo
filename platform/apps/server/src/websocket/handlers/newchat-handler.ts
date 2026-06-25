import { chatAnswer, chatQuestions, chats, db } from "@repo/db";
import { z } from "zod";
import { WebSocket } from "ws";
import { AppError } from "../../lib/app-error.js";
import { generateText, stepCountIs, tool } from "ai";
import { projectValidatorForAIInput } from "@repo/shared";
import {
  createNewGithubRepo,
  getUserReposAITool,
} from "../../ai/ai-tools/index.js";
// import {v4 as } from "u  "

export const newChatHandler = async (socket: WebSocket, eventData: unknown) => {
  const userId = socket.userId;

  const parsedData = z
    .object({
      question: z.string().min(3).max(3000),
    })
    .parse(eventData);

  const [chatId, chatQuestionId] = [crypto.randomUUID(), crypto.randomUUID()];
  // create the chat for user
  // const { chat, chatQuestion } = await db.transaction(async (tx) => {
  //   const [chat] = await tx
  //     .insert(chats)
  //     .values({
  //       id: chatId,
  //       name: "unknown",
  //       user_id: userId,
  //     })
  //     .returning();
  //   if (!chat) throw new AppError("something went wrong", 500);
  //   const [chatQuestion] = await tx
  //     .insert(chatQuestions)
  //     .values({
  //       id: chatQuestionId,
  //       chat_id: chat.id,
  //       question: parsedData.question,
  //       order_number: 0,
  //     })
  //     .returning();
  //
  //   if (!chatQuestion) throw new AppError("something went wrong ", 500);
  //   return { chat, chatQuestion };
  // });

  console.log(`we are working `);
  const answer = await aiWork(parsedData.question, socket.userId);
  // await db.insert(chatAnswer).values({
  //   question_id: chatQuestion.id,
  //   answer: answer,
  // });
  console.log(answer);
};

const updateConfig = tool({
  description: "Update the config with the user given data",
  inputSchema: projectValidatorForAIInput.extend({}),
  execute: async (data: unknown) => {
    const valid = projectValidatorForAIInput.parse(data);
    console.log(valid);
    return valid;
  },
});

const getCurrentConfig = tool({
  description: "Get the current to read check what we already have",
  inputSchema: z.object(),
  execute: async () => {
    return {
      gitUrl: "",
      awsRegion: null,
      ec2Type: null,
    };
  },
});

const aiWork = async (question: string, userId: string) => {
  const result = await generateText({
    model: "openai/gpt-5-nano",
    system:
      "You are a expert vibeongo project config maker. You can ask the question regading that as needed and can use the internal tools for it. You have ask user to for each tthing as the user want so do me your own Your motive is compelte the config you can ask user next queistons  , if config is not rpooerp you can getprev config fomthe getCurrentConfig toll and after adding new thigns those areginven i nte thsi pronpt call updateConfig then asked the user  quesions about missign thisns",
    tools: {
      // weatherTool,
      getUserReposAITool: getUserReposAITool(userId),
      getCurrentConfig,
      updateConfig,
      createNewGithubRepo: createNewGithubRepo(userId),
    },
    stopWhen: stepCountIs(2),
    prompt: question,
  });

  let response = "";

  for (const part of result.content) {
    if (part.type === "text") {
      response += part.text;
    }
  }
  return response;
};
