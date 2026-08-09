import { chatAnswer, chatQuestions, type ChatQuestionPayload } from "@repo/db";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { prompts } from "../prompts/index.js";
import {
  addGithubRepositoryAgentTool,
  createProjectAgentTool,
  createProjectFileAgentTool,
  getProjectConfigAgentTool,
  getInstanceCatalogAgentTool,
  getUserReposListAgentTool,
  getUserSshKeysAgentTool,
  getUserConfigsAgentTool,
  listProjectFilesAgentTool,
  listProjectsAgentTool,
  readProjectFileAgentTool,
  updateProjectAgentTool,
  updateProjectFileAgentTool,
} from "../agent-tools/vibeongo-agent-tools.js";

type QuesitonWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};
interface vibeongoAIAgent {
  query: string;
  payload: ChatQuestionPayload;
  userId: string;
  prevConfig: string;
  QAs: QuesitonWithAnswer[];
}

export function resolveChatQuestionMentions(
  question: string,
  payload: ChatQuestionPayload,
) {
  return question.replace(/@\{\{(\d+)\}\}/g, (token, rawIndex: string) => {
    const mention = payload.mentions[Number(rawIndex) - 1];
    if (!mention) return token;

    return `@${mention.name} (project ID: ${mention.id})`;
  });
}

export async function* vibeongoAIAgent({
  query,
  payload,
  userId,
  QAs,
}: vibeongoAIAgent): AsyncGenerator<{
  text: string;
  finish_reason: string | null;
  steps: any;
  usage: any;
  updatedConfig: any;
  reasoning: string;
}> {
  const history: ModelMessage[] = [];

  QAs.map((qa) => {
    if (qa.question && qa.chatAnswer?.answer) {
      history.push({
        role: "user",
        content: resolveChatQuestionMentions(qa.question, qa.payload),
      });
      if (qa.chatAnswer?.answer) {
        history.push({ role: "assistant", content: qa.chatAnswer?.answer });
      }
    }
  });

  const result = streamText({
    model: "zai/glm-5.2",
    system: prompts.vibeongo.systemPrompt(),
    reasoning: "high",
    tools: {
      getUserRepositories: getUserReposListAgentTool(userId),
      getUserSshKeys: getUserSshKeysAgentTool(userId),
      getUserConfigurations: getUserConfigsAgentTool(userId),
      getInstanceCatalog: getInstanceCatalogAgentTool(),
      listProjects: listProjectsAgentTool(userId),
      getProjectConfig: getProjectConfigAgentTool(userId),
      addGithubRepository: addGithubRepositoryAgentTool(userId),
      createProject: createProjectAgentTool(userId),
      updateProject: updateProjectAgentTool(userId),
      listProjectFiles: listProjectFilesAgentTool(userId),
      readProjectFile: readProjectFileAgentTool(userId),
      updateProjectFile: updateProjectFileAgentTool(userId),
      createProjectFile: createProjectFileAgentTool(userId),
    },
    stopWhen: stepCountIs(40),
    messages: [
      ...history,
      {
        role: "user",
        content: resolveChatQuestionMentions(query, payload),
      },
    ],
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
