import { Command } from "commander";
import {
  DEFAULT_SERVER_URL,
  getUserMetadata,
  normalizeServerUrl,
} from "../lib/api.js";
import { saveApiKey } from "../lib/credential-store.js";
import { formatAccount } from "../lib/format-account.js";

interface LoginDependencies {
  prompt: () => Promise<string>;
  validate: typeof getUserMetadata;
  save: typeof saveApiKey;
  print: (message: string) => void;
}

export async function login(
  serverUrl: string,
  dependencies: LoginDependencies,
) {
  const origin = normalizeServerUrl(serverUrl);
  const apiKey = (await dependencies.prompt()).trim();
  if (!/^vog_[A-Za-z0-9_-]+$/.test(apiKey)) {
    throw new Error("Enter a Vibeongo API key beginning with vog_.");
  }
  const user = await dependencies.validate(origin, apiKey);
  await dependencies.save(origin, apiKey);
  dependencies.print("\nLogin successful.");
  dependencies.print(
    formatAccount(user, origin).replaceAll(apiKey, "[redacted]"),
  );
  dependencies.print("\nAPI key saved securely in your OS credential store.");
}

export function createLoginCommand() {
  return new Command("login")
    .description(
      "Validate a Vibeongo API key and save it in the OS credential store",
    )
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .action(async (options: { serverUrl: string }) => {
      await login(options.serverUrl, {
        prompt: async () => {
          if (!process.stdin.isTTY || !process.stdout.isTTY) {
            throw new Error(
              "Run login in an interactive terminal to enter your API key securely.",
            );
          }
          const { default: password } = await import("@inquirer/password");
          return password({
            message: "Vibeongo API key:",
            mask: true,
            toggleMask: false,
            validate: (value) =>
              /^vog_[A-Za-z0-9_-]+$/.test(value.trim()) ||
              "Enter a Vibeongo API key beginning with vog_.",
          });
        },
        validate: getUserMetadata,
        save: saveApiKey,
        print: console.log,
      });
    });
}
