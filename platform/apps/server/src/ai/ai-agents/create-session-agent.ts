import type { telegramBotChatSessionMessage } from "@repo/db";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import { prompts } from "../prompts/index.js";
import {
  createProjectSessionInstanceAITool,
  getProjectGithubRepos,
} from "../ai-tools/session-agent-tools.js";

export async function* createProjectSessionAgent({
  message,
  projectId,
  userId,
  sessionMessages,
}: {
  message: string;
  projectId: string;
  userId: string;
  sessionMessages: Pick<
    typeof telegramBotChatSessionMessage.$inferSelect,
    "role" | "text"
  >[];
}): AsyncGenerator<{
  text: string;
  finish_reason: string | null;
  steps: any;
  usage: any;
  updatedConfig: any;
  reasoning: string;
}> {
  const history: ModelMessage[] = [];

  for (const sessionMessage of sessionMessages) {
    history.push({
      role: sessionMessage.role === "bot" ? "assistant" : "user",
      content: sessionMessage.text,
    });
  }

  const result = streamText({
    model: "zai/glm-5.2",
    system: prompts.createProjectSessionAgent.systemPrompt(),
    reasoning: "high",
    tools: {
      getProjectGithubRepos: getProjectGithubRepos(userId, projectId),
      createProjectSessionInstance: createProjectSessionInstanceAITool(
        userId,
        projectId,
      ),
    },
    // The model must be able to call the repository tool and then produce its
    // user-facing task proposal in a following step.
    stopWhen: stepCountIs(10),
    messages: [...history, { role: "user", content: message }],
  });

  let updatedConfig = null;
  let reasoning = "";
  for await (const chunk of result.stream) {
    if (chunk.type === "reasoning-delta") {
      reasoning += chunk.text;
      yield {
        finish_reason: null,
        reasoning: chunk.text,
        text: "",
        updatedConfig,
        usage: null,
        steps: null,
      };
    }

    if (chunk.type === "text-delta") {
      yield {
        finish_reason: null,
        reasoning: "",
        text: chunk.text,
        updatedConfig,
        usage: null,
        steps: null,
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
    finish_reason: null,
    reasoning: "",
    text: "",
    updatedConfig,
    usage: await result.usage,
    steps,
  };
}
