import { Effect } from "effect";
import { createApiClient } from "../lib/api-client.js";
import { CliError } from "../lib/cli-error.js";
import { setKey } from "../lib/keychain.js";
import { readApiKey } from "../lib/read-api-key.js";

export function login() {
  return Effect.gen(function* () {
    const key = yield* readApiKey;
    if (!key.startsWith("vog_")) {
      return yield* Effect.fail(new CliError("API key must start with vog_."));
    }

    const client = createApiClient(key);
    const metadata = yield* Effect.tryPromise({
      try: () => client.users.getUserMetadata(),
      catch: () => new CliError("Login failed. The API key could not be verified."),
    });

    yield* setKey(key);
    yield* Effect.sync(() => console.log(`Logged in as ${metadata.username}.`));
  });
}
