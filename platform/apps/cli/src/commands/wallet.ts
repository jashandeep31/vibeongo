import { formatInternalMoney } from "@repo/shared/money";
import { createApiClient } from "../lib/api-client.js";
import { getKey } from "../lib/keychain.js";

export async function wallet(): Promise<void> {
  let key: string | null;
  try {
    key = await getKey();
  } catch {
    console.error("Could not read the system keychain.");
    process.exitCode = 1;
    return;
  }

  if (!key) {
    console.error("Not logged in. Run vibeongo login first.");
    process.exitCode = 1;
    return;
  }

  try {
    const response = await createApiClient(key).wallet.getWallet();
    const userWallet = response.data.wallet;
    if (!userWallet) {
      console.error("No wallet found for this account.");
      process.exitCode = 1;
      return;
    }

    console.log(
      `Balance: $${formatInternalMoney(userWallet.balance, 2)} credits`,
    );
  } catch {
    console.error(
      "Could not load wallet. Check your login and server connection.",
    );
    process.exitCode = 1;
  }
}
