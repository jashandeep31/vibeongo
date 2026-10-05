import { normalizeServerUrl } from "./api.js";

const SERVICE_NAME = "com.vibeongo.cli";

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

export async function saveApiKey(serverUrl: string, apiKey: string) {
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
  const entry = await getEntry(serverUrl);
  try {
    return await entry.getPassword();
  } catch {
    throw new Error(
      "Could not read the API key from the OS credential store. Unlock the keychain and try again.",
    );
  }
}
