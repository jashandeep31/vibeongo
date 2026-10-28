import type { McpServer } from "@modelcontextprotocol/server";
import { db, eq, userWallet } from "@repo/db";
import { INTERNAL_MONEY_SCALE } from "@repo/shared/money";
import type { McpUser } from "../create-server.js";

export function registerCurrentUserTool(
  server: McpServer,
  user: McpUser,
): void {
  server.registerTool(
    "get_current_user",
    {
      description:
        "Get the authenticated VibeOnGo user's username, name, tier, and current wallet balance. Balance is stored in internal units; 10,000,000 units equal one USD credit.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () => {
      const [wallet] = await db
        .select({ balance: userWallet.balance })
        .from(userWallet)
        .where(eq(userWallet.user_id, user.id));

      if (!wallet) {
        return {
          isError: true,
          content: [
            { type: "text", text: "Wallet not found for this account." },
          ],
        };
      }

      // Explicitly allowlist public account fields, matching the CLI metadata.
      const account = {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        tier: user.tier,
        balance: wallet.balance,
        balanceUsd: wallet.balance / INTERNAL_MONEY_SCALE,
        currency: "USD",
      };

      return {
        content: [{ type: "text", text: JSON.stringify(account) }],
        structuredContent: account,
      };
    },
  );
}
