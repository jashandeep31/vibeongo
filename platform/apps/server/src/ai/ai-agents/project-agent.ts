/**
 * @deprecated This legacy project agent is no longer used. Project chat now
 * runs through `vibeongoAIAgent`. Keep this file only as a reference until the
 * legacy agent is permanently removed.
 */
import { chatAnswer, chatQuestions, type ChatQuestionPayload } from "@repo/db";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { prompts } from "../prompts/index.js";
import {
  getCurrentConfigAITool,
  updateConfigInMemAITool,
} from "../agent-tools/project-ai-tools.js";
import {
  addGithubRepositoryAgentTool,
  createProjectAgentTool,
  createProjectFileAgentTool,
  getInstanceCatalogAgentTool,
  getProjectConfigAgentTool,
  getUserConfigsAgentTool,
  getUserReposListAgentTool,
  getUserSshKeysAgentTool,
  listProjectFilesAgentTool,
  listProjectsAgentTool,
  readProjectFileAgentTool,
  updateProjectAgentTool,
  updateProjectFileAgentTool,
} from "../agent-tools/vibeongo-agent-tools.js";

type QuesitonWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};
interface projectAIAgent {
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

export async function* projectAIAgent({
  query,
  payload,
  userId,
  prevConfig,
  QAs,
}: projectAIAgent): AsyncGenerator<{
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
    system: prompts.createProject.systemPrompt(),
    reasoning: "high",
    tools: {
      // weatherTool,
      getUserRepositories: getUserReposListAgentTool(userId),
      getUserSshKeys: getUserSshKeysAgentTool(userId),
      getUserConfigurations: getUserConfigsAgentTool(userId),
      getInstanceCatalog: getInstanceCatalogAgentTool(),
      getCurrentConfig: getCurrentConfigAITool(prevConfig),
      updateConfig: updateConfigInMemAITool,
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
    // toolChoice: { type: "tool", toolName: "updateConfig" },
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
