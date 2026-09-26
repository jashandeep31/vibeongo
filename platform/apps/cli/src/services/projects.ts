import type { GetProjectOverviewParams } from "@repo/api-client";
import { Effect } from "effect";
import { CliError } from "../lib/cli-error.js";
import { getAuthenticatedClient } from "./authenticated-client.js";

export function getProjectOverview(params: GetProjectOverviewParams = {}) {
  return Effect.gen(function* () {
    const client = yield* getAuthenticatedClient();
    return yield* Effect.tryPromise({
      try: () => client.projects.getProjectOverview(params),
      catch: () =>
        new CliError(
          "Could not get projects. Check the server connection or run vibeongo login again.",
        ),
    });
  });
}
