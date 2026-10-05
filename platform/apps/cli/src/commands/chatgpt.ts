import { Command } from "commander";

export function createChatgptCommand() {
  const command = new Command("chatgpt").description(
    "Connect a ChatGPT account",
  );
  command
    .command("login")
    .description("Continue with ChatGPT and print the full OAuth response")
    .option("--new-account", "Register another ChatGPT account or workspace")
    .option(
      "--client-id <id>",
      "Sign in with a previously saved client registration",
    )
    .action(async (options: { newAccount?: boolean; clientId?: string }) => {
      const { loginWithChatgpt } = await import("../lib/chatgpt-login.js");
      await loginWithChatgpt(options);
    });
  return command;
}
