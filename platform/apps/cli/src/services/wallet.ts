import { formatInternalMoney } from "@repo/shared/money";
import { Effect } from "effect";
import { createApiClient } from "../lib/api-client.js";
import { CliError } from "../lib/cli-error.js";
import { getKey } from "../lib/keychain.js";

export function getWalletBalance() {
  return Effect.gen(function* () {
    const key = yield* getKey();
    if (!key) {
      return yield* Effect.fail(
        new CliError("Not logged in. Run vibeongo login first."),
      );
    }

    const response = yield* Effect.tryPromise({
      try: () => createApiClient(key).wallet.getWallet(),
      catch: () =>
        new CliError(
          "Could not get wallet. Check the server connection or run vibeongo login again.",
        ),
    });
    const wallet = response.data.wallet;
    if (!wallet) {
      return yield* Effect.fail(
        new CliError("No wallet found for this account."),
      );
    }

    return `Balance: $${formatInternalMoney(wallet.balance, 2)} credits`;
  });
}
