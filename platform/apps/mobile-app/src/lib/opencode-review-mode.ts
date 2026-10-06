import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type OpencodeReviewMode = "working" | "last-turn";
const REVIEW_MODE_KEY = "vibeongo.opencodeReviewMode";
function storageKey(scope?: string) {
  return scope
    ? `${REVIEW_MODE_KEY}.${Array.from(scope)
        .map((char) => char.codePointAt(0)!.toString(16))
        .join("-")}`
    : REVIEW_MODE_KEY;
}
let pendingWrite: Promise<void> = Promise.resolve();

export async function getOpencodeReviewMode(
  scope?: string,
): Promise<OpencodeReviewMode> {
  try {
    const key = storageKey(scope);
    await pendingWrite;
    const stored =
      Platform.OS === "web"
        ? globalThis.localStorage?.getItem(key)
        : await SecureStore.getItemAsync(key);
    return stored === "last-turn" ? "last-turn" : "working";
  } catch {
    return "working";
  }
}

export function setOpencodeReviewMode(
  mode: OpencodeReviewMode,
  scope?: string,
) {
  const key = storageKey(scope);
  // Preserve the latest choice even when native storage writes finish asynchronously.
  pendingWrite = pendingWrite
    .then(async () => {
      if (Platform.OS === "web") globalThis.localStorage?.setItem(key, mode);
      else await SecureStore.setItemAsync(key, mode);
    })
    .catch((error) =>
      console.warn("Could not save OpenCode review mode", error),
    );
  return pendingWrite;
}
