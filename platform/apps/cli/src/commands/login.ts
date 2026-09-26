import { createApiClient } from "../lib/api-client.js";
import { setKey } from "../lib/keychain.js";
import { readApiKey } from "../lib/read-api-key.js";

export async function login(): Promise<void> {
  let key: string;
  try {
    key = await readApiKey();
  } catch {
    console.error("Login cancelled.");
    process.exitCode = 1;
    return;
  }

  if (!key.startsWith("vog_")) {
    console.error("API key must start with vog_.");
    process.exitCode = 1;
    return;
  }

  const client = createApiClient(key);
  let username: string;
  try {
    const metadata = await client.users.getUserMetadata();
    username = metadata.username;
  } catch {
    console.error("Login failed. The API key could not be verified.");
    process.exitCode = 1;
    return;
  }

  try {
    await setKey(key);
    console.log(`Logged in as ${username}.`);
  } catch {
    console.error(
      "The API key was verified, but could not be saved to the system keychain.",
    );
    process.exitCode = 1;
  }
}
