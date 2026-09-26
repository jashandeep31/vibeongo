import { Effect } from "effect";
import { getWalletBalance } from "../services/wallet.js";

export function wallet() {
  return Effect.flatMap(getWalletBalance(), (balance) =>
    Effect.sync(() => console.log(balance)),
  );
}
