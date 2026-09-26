import { formatInternalMoney } from "@repo/shared/money";
import { Effect } from "effect";
import { CliError } from "../lib/cli-error.js";
import { getAuthenticatedClient } from "./authenticated-client.js";

export function getWalletBalance() {
  return Effect.gen(function* () {
    const client = yield* getAuthenticatedClient();

    const response = yield* Effect.tryPromise({
      try: () => client.wallet.getWallet(),
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
