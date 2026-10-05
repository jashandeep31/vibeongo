import { normalizeServerUrl } from "./api.js";

export async function saveCodexCredentials(
  serverUrl: string,
  apiKey: string,
  credentials: Record<string, unknown>,
  signal: AbortSignal,
) {
  const origin = normalizeServerUrl(serverUrl);
  let response: Response;
  try {
    response = await fetch(`${origin}/api/v1/users/provider-credentials/codex`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
  } catch {
    throw new Error(
      "Could not save ChatGPT credentials to Vibeongo. Check the server connection and sign in again.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "Vibeongo rejected your API key. Run vibeongo login for this server, then retry ChatGPT sign-in.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `Could not save ChatGPT credentials to Vibeongo (HTTP ${response.status}). Sign in again after resolving the server error.`,
    );
  }
}
