import { Effect } from "effect";
import { createApiClient } from "./api-client.js";
import { CliError } from "./cli-error.js";
import { getKey } from "./keychain.js";

type ApiClient = ReturnType<typeof createApiClient>;

export function withAuthenticatedClient<Args extends unknown[]>(
  action: (client: ApiClient, ...args: Args) => Effect.Effect<void, CliError>,
): (...args: Args) => Effect.Effect<void, CliError> {
  return (...args: Args) =>
    Effect.gen(function* () {
      const key = yield* getKey();
      if (!key) {
        return yield* Effect.fail(
          new CliError("Not logged in. Run vibeongo login first."),
        );
      }

      yield* action(createApiClient(key), ...args);
    });
}
