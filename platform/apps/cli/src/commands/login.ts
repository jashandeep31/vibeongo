import { Command } from "commander";
import {
  DEFAULT_SERVER_URL,
  getUserMetadata,
  normalizeServerUrl,
} from "../lib/api.js";
import {
  saveApiKey,
  resolveCredentialStorage,
  type CredentialStoreOptions,
} from "../lib/credential-store.js";
import { defaultConfigPath } from "../lib/file-credential-store.js";
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
  storeOptions: CredentialStoreOptions = {},
) {
  const storage = resolveCredentialStorage(storeOptions);
  const origin = normalizeServerUrl(serverUrl);
  const apiKey = (await dependencies.prompt()).trim();
  if (!/^vog_[A-Za-z0-9_-]+$/.test(apiKey)) {
    throw new Error("Enter a Vibeongo API key beginning with vog_.");
  }
  const user = await dependencies.validate(origin, apiKey);
  await dependencies.save(origin, apiKey, storeOptions);
  dependencies.print("\nLogin successful.");
  dependencies.print(
    formatAccount(user, origin).replaceAll(apiKey, "[redacted]"),
  );
  dependencies.print(
    storage === "file"
      ? `\nAPI key saved in ${defaultConfigPath()} (plaintext; owner-only file permissions).`
      : "\nAPI key saved securely in your OS credential store.",
  );
}

export function createLoginCommand() {
  return new Command("login")
    .description("Validate and save a Vibeongo API key")
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .option("--storage <mode>", "API key storage: keyring (default) or file")
    .action(
      async (options: { serverUrl: string; storage?: "keyring" | "file" }) => {
        await login(
          options.serverUrl,
          {
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
          },
          { storage: options.storage },
        );
      },
    );
}
