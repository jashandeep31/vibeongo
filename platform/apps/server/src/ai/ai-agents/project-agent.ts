import { chatAnswer, chatQuestions } from "@repo/db";
import {
  ModelMessage,
  stepCountIs,
  StepResult,
  streamText,
  StreamTextResult,
} from "ai";
import { prompts } from "../prompts/index.js";
import {
  getOtherProjectConfigById,
  createNewGithubRepo,
  getAllProjectNameAndIds,
  getInstanceCatalogAITool,
  getUserReposAITool,
  getUserSshKeysAITool,
  createAndSaveProjectTool,
  updateProjectByIdTool,
  getCurrentConfigAITool,
  updateConfigInMemAITool,
} from "../../ai/ai-tools/project-ai-tools.js";

type QuesitonWithAnswer = typeof chatQuestions.$inferSelect & {
  chatAnswer: typeof chatAnswer.$inferSelect | null;
};
interface projectAIAgent {
  query: string;
  userId: string;
  prevConfig: string;
  QAs: QuesitonWithAnswer[];
}
export async function* projectAIAgent({
  query,
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
  console.log("we are working ");
  const history: ModelMessage[] = [];

  QAs.map((qa) => {
    if (qa.question && qa.chatAnswer?.answer) {
      history.push({ role: "user", content: qa.question });
      if (qa.chatAnswer?.answer) {
        history.push({ role: "assistant", content: qa.chatAnswer?.answer });
      }
    }
  });
  console.log("we are working ");

  const result = streamText({
    model: "openai/gpt-oss-120b",
    system: prompts.createProject.systemPrompt(),
    reasoning: "high",
    tools: {
      // weatherTool,
      getUserReposAITool: getUserReposAITool(userId),
      getUserSshKeysAITool: getUserSshKeysAITool(userId),
      getInstanceCatalogAITool: getInstanceCatalogAITool(),
      getCurrentConfig: getCurrentConfigAITool(prevConfig),
      updateConfig: updateConfigInMemAITool,
      getAllProjectNameAndIds: getAllProjectNameAndIds(userId),
      getOtherProjectConfigById: getOtherProjectConfigById(userId),
      createNewGithubRepo: createNewGithubRepo(userId),
      createAndSaveProjectAITool: createAndSaveProjectTool(userId),
      updateProjectById: updateProjectByIdTool(userId),
    },
    stopWhen: stepCountIs(20),
    messages: [...history, { role: "user", content: query }],
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
}
