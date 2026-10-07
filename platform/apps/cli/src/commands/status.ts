import { Command } from "commander";
import {
  DEFAULT_SERVER_URL,
  getUserMetadata,
  normalizeServerUrl,
} from "../lib/api.js";
import { getApiKey } from "../lib/credential-store.js";
import { formatAccount } from "../lib/format-account.js";

interface StatusDependencies {
  read: typeof getApiKey;
  validate: typeof getUserMetadata;
  print: (message: string) => void;
}

export async function status(
  serverUrl: string,
  dependencies: StatusDependencies,
) {
  const origin = normalizeServerUrl(serverUrl);
  const apiKey = await dependencies.read(origin);
  if (!apiKey) {
    throw new Error(
      "Not logged in to this server. Run vibeongo login with the same --server-url.",
    );
  }
  const user = await dependencies.validate(origin, apiKey);
  dependencies.print("\nLogged in.");
  dependencies.print(
    formatAccount(user, origin).replaceAll(apiKey, "[redacted]"),
  );
}

export function createStatusCommand() {
  return new Command("status")
    .description("Check login status and show the current account")
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .action(async (options: { serverUrl: string }) => {
      await status(options.serverUrl, {
        read: getApiKey,
        validate: getUserMetadata,
        print: console.log,
      });
    });
}
