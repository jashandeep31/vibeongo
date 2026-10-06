import { stripVTControlCharacters } from "node:util";
import type { UserMetadata } from "./api.js";

function terminalText(value: string) {
  return stripVTControlCharacters(value).replace(
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f-\u009f]/g,
    " ",
  );
}

export function formatAccount(user: UserMetadata, serverUrl: string) {
  // Matches the internal money scale in @repo/shared/src/money.ts.
  const balance = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(user.balance / 10_000_000);
  const rows = [
    ["Name", [user.firstName, user.lastName].filter(Boolean).join(" ")],
    ["Username", user.username],
    ["Tier", user.tier],
    ["Balance", `${balance} credits`],
    ["Forgejo", user.forgejo_username ?? "Not connected"],
    ...(user.forgejo_profile_link
      ? [["Profile", user.forgejo_profile_link]]
      : []),
    ["Server", serverUrl],
  ] as [string, string][];
  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  return [
    "",
    "Account",
    ...rows.map(
      ([label, value]) =>
        `  ${label.padEnd(labelWidth)}  ${terminalText(value)}`,
    ),
  ].join("\n");
}
