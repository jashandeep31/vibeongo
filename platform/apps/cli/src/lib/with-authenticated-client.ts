import { createApiClient } from "./api-client.js";
import { CliError } from "./cli-error.js";
import { getKey } from "./keychain.js";

type ApiClient = ReturnType<typeof createApiClient>;

export function withAuthenticatedClient<Args extends unknown[]>(
  action: (client: ApiClient, ...args: Args) => Promise<void>,
): (...args: Args) => Promise<void> {
  return async (...args: Args) => {
    try {
      let key: string | null;
      try {
        key = await getKey();
      } catch {
        throw new CliError("Could not read the system keychain.");
      }

      if (!key) throw new CliError("Not logged in. Run vibeongo login first.");

      await action(createApiClient(key), ...args);
    } catch (error) {
      console.error(
        error instanceof CliError
          ? error.message
          : "Command failed. Check the server connection or run vibeongo login again.",
      );
      process.exitCode = 1;
    }
  };
}
