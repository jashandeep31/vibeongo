import { formatInternalMoney } from "@repo/shared/money";
import type { createApiClient } from "../lib/api-client.js";
import { CliError } from "../lib/cli-error.js";

export async function wallet(
  client: ReturnType<typeof createApiClient>,
): Promise<void> {
  const response = await client.wallet.getWallet();
  const userWallet = response.data.wallet;
  if (!userWallet) throw new CliError("No wallet found for this account.");

  console.log(
    `Balance: $${formatInternalMoney(userWallet.balance, 2)} credits`,
  );
}
