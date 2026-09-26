import { deleteKey } from "../lib/keychain.js";

export async function logout(): Promise<void> {
  try {
    const removed = await deleteKey();
    console.log(removed ? "Logged out." : "Already logged out.");
  } catch {
    console.error("Could not remove the API key from the system keychain.");
    process.exitCode = 1;
  }
}
