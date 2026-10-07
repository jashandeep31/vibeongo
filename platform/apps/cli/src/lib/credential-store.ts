import { normalizeServerUrl } from "./api.js";
import {
  deleteFileApiKey,
  getFileApiKey,
  saveFileApiKey,
} from "./file-credential-store.js";

const SERVICE_NAME = "com.vibeongo.cli";

export interface CredentialStoreOptions {
  storage?: "keyring" | "file";
}

export function resolveCredentialStorage(
  options: CredentialStoreOptions = {},
): "keyring" | "file" {
  if (
    options.storage &&
    options.storage !== "keyring" &&
    options.storage !== "file"
  ) {
    throw new Error("Use --storage keyring or --storage file.");
  }
  return options.storage ?? "keyring";
}

async function getEntry(serverUrl: string) {
  const origin = normalizeServerUrl(serverUrl);
  try {
    const { AsyncEntry } = await import("@napi-rs/keyring");
    return new AsyncEntry(SERVICE_NAME, origin, {
      linux: { store: "secret-service" },
    });
  } catch {
    throw new Error(
      "The OS credential store is unavailable. Unlock your keychain; on Linux, enable a Secret Service provider such as GNOME Keyring or KWallet. No plaintext fallback is used.",
    );
  }
}

export async function saveApiKey(
  serverUrl: string,
  apiKey: string,
  options: CredentialStoreOptions = {},
) {
  if (resolveCredentialStorage(options) === "file") {
    return saveFileApiKey(serverUrl, apiKey);
  }
  const entry = await getEntry(serverUrl);
  try {
    await entry.setPassword(apiKey);
  } catch {
    throw new Error(
      "Could not save the API key in the OS credential store. Unlock the keychain and try again.",
    );
  }
}

export async function getApiKey(
  serverUrl: string,
): Promise<string | undefined> {
  try {
    const keyringKey = await (await getEntry(serverUrl)).getPassword();
    if (keyringKey) return keyringKey;
  } catch {
    // File-backed login still works when the OS credential store is unavailable.
  }
  return getFileApiKey(serverUrl);
}

export async function deleteApiKey(serverUrl: string): Promise<{
  removed: boolean;
  keyringUnavailable: boolean;
}> {
  let removedFromKeyring = false;
  let keyringUnavailable = false;
  try {
    removedFromKeyring = await (await getEntry(serverUrl)).deleteCredential();
  } catch {
    keyringUnavailable = true;
  }
  const removedFromFile = await deleteFileApiKey(serverUrl);
  return { removed: removedFromKeyring || removedFromFile, keyringUnavailable };
}
