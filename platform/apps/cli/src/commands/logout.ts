import { Command } from "commander";
import { DEFAULT_SERVER_URL } from "../lib/api.js";
import { deleteApiKey } from "../lib/credential-store.js";

export function createLogoutCommand() {
  return new Command("logout")
    .description("Remove the saved Vibeongo API key for this server")
    .option("--server-url <url>", "Vibeongo server origin", DEFAULT_SERVER_URL)
    .action(async (options: { serverUrl: string }) => {
      const result = await deleteApiKey(options.serverUrl);
      if (result.keyringUnavailable) {
        console.log(
          result.removed
            ? "File API key removed. Keyring unavailable; its entry could not be checked."
            : "No file API key found. Keyring unavailable; its entry could not be checked.",
        );
      } else {
        console.log(result.removed ? "Logged out." : "Already logged out.");
      }
    });
}
