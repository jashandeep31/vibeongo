import { formatInternalMoney } from "@repo/shared/money";
import { Effect } from "effect";
import type { createApiClient } from "../lib/api-client.js";
import { CliError } from "../lib/cli-error.js";

export function wallet(
  client: ReturnType<typeof createApiClient>,
) {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () => client.wallet.getWallet(),
      catch: () =>
        new CliError("Command failed. Check the server connection or run vibeongo login again."),
    });
    const userWallet = response.data.wallet;
    if (!userWallet) {
      return yield* Effect.fail(new CliError("No wallet found for this account."));
    }

    yield* Effect.sync(() =>
      console.log(
        `Balance: $${formatInternalMoney(userWallet.balance, 2)} credits`,
      ),
    );
  });
}
