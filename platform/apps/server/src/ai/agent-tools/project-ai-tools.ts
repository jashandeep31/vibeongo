/**
 * @deprecated These legacy in-memory configuration tools are used only by the
 * deprecated `projectAIAgent`. VibeOnGo does not register them. Keep this file
 * only in case the legacy configuration workflow needs to be restored.
 */
import { projectValidatorForAIInput } from "@repo/shared";
import { tool, Tool } from "ai";
import { z } from "zod";

export const updateConfigInMemAITool: Tool = tool({
  description:
    "Store the current project configuration in memory after making changes. Pass every field collected so far, including provider, sandboxTypeId, ports, and packages when known.",
  inputSchema: projectValidatorForAIInput.extend({}),
  execute: async (data: unknown) => {
    const valid = projectValidatorForAIInput.parse(data);
    return valid;
  },
});

export const getCurrentConfigAITool = (config: unknown): Tool =>
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
