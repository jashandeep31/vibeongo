import type { CreateInstanceInput } from "@repo/api-client";
import { Effect } from "effect";
import { CliError } from "../lib/cli-error.js";
import { getAuthenticatedClient } from "./authenticated-client.js";

export function createInstance(input: CreateInstanceInput) {
  return Effect.gen(function* () {
    const client = yield* getAuthenticatedClient();
    return yield* Effect.tryPromise({
      try: () => client.instances.createInstance(input),
      catch: (error) => {
        if (
          typeof error === "object" &&
          error !== null &&
          "response" in error
        ) {
          const response = (
            error as { response?: { data?: { message?: unknown } } }
          ).response;
          if (typeof response?.data?.message === "string") {
            return new CliError(response.data.message);
          }
        }
        return new CliError(
          "Could not create the instance. Check the server connection or your API key.",
        );
      },
    });
  });
}
