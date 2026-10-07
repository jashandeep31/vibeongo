import { formatSshCommand, MobileClient } from "@repo/api-client";
import { Command } from "commander";
import { DEFAULT_SERVER_URL, normalizeServerUrl } from "../lib/api.js";
import { getApiKey } from "../lib/credential-store.js";

export function createSshCommand(): Command {
  return new Command("ssh")
    .description("Create SSH access for a running instance")
    .argument("<instance-id>", "Instance ID shown by vibeongo projects")
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .action(async (instanceId: string, options: { serverUrl: string }) => {
      const origin = normalizeServerUrl(options.serverUrl);
      const apiKey = await getApiKey(origin);
      if (!apiKey) {
        throw new Error(
          `Not logged in to ${origin}. Run vibeongo login${origin === DEFAULT_SERVER_URL ? "" : ` --server-url ${origin}`}.`,
        );
      }

      const client = new MobileClient(origin, apiKey);
      client.apiClient.defaults.timeout = 15_000;
      try {
        const access = await client.sshAccess.createSshAccess(instanceId);
        console.log(formatSshCommand(access));
      } catch (error) {
        const status = (error as { response?: { status?: number } })?.response
          ?.status;
        if (status === 401 || status === 403) {
          throw new Error(`API key rejected by ${origin}. Run vibeongo login again.`);
        }
        if (status === 404) {
          throw new Error("Running instance not found or unavailable for SSH.");
        }
        if (status) {
          throw new Error(`Could not create SSH access (HTTP ${status}).`);
        }
        throw new Error("Could not reach the Vibeongo server to create SSH access.");
      }
    });
}
