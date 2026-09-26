import { Effect } from "effect";
import { deleteKey } from "../lib/keychain.js";

export function logout() {
  return Effect.gen(function* () {
    const removed = yield* deleteKey();
    yield* Effect.sync(() =>
      console.log(removed ? "Logged out." : "Already logged out."),
    );
  });
}
