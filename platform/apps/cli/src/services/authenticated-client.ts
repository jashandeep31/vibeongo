import { Effect } from "effect";
import { createApiClient } from "../lib/api-client.js";
import { CliError } from "../lib/cli-error.js";
import { getKey } from "../lib/keychain.js";

export function getAuthenticatedClient() {
  return Effect.gen(function* () {
    const key = yield* getKey();
    if (!key) {
      return yield* Effect.fail(
        new CliError("Not logged in. Run vibeongo login first."),
      );
    }
    return createApiClient(key);
  });
}
