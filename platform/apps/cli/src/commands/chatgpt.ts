import { Command } from "commander";
import { DEFAULT_SERVER_URL } from "../lib/api.js";
import { LoginRequiredError } from "../lib/login-required-error.js";

export function createChatgptCommand() {
  const command = new Command("chatgpt").description(
    "Connect a ChatGPT account",
  );
  command
    .command("login")
    .description("Continue with ChatGPT and save credentials to Vibeongo")
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .option("--new-account", "Register another ChatGPT account or workspace")
    .option(
      "--client-id <id>",
      "Sign in with a previously saved client registration",
    )
    .action(async (options: {
      newAccount?: boolean;
      clientId?: string;
      serverUrl: string;
    }) => {
      try {
        const { loginWithChatgpt } = await import("../lib/chatgpt-login.js");
        await loginWithChatgpt(options);
      } catch (error) {
        if (error instanceof LoginRequiredError) throw error;
        throw new Error("ChatGPT sign-in failed.");
      }
    });
  return command;
}
