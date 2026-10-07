export const DEFAULT_SERVER_URL = "http://localhost:8000";

export function normalizeServerUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Enter a valid server URL.");
  }
  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "Use an HTTPS server origin, or HTTP on localhost for development. Do not include a path, query, or credentials.",
    );
  }
  return url.origin;
}

export interface UserMetadata {
  id: string;
  username: string;
  tier: string;
  balance: number;
  firstName: string;
  lastName: string | null;
  forgejo_username: string | null;
  forgejo_profile_link: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

export async function getUserMetadata(
  serverUrl: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<UserMetadata> {
  const origin = normalizeServerUrl(serverUrl);
  let response: Response;
  try {
    response = await fetcher(`${origin}/api/v1/users/metadata`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error(
      "Could not reach the Vibeongo server. Check the URL and connection.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new Error(
      "API key rejected. Check that it is valid, active, and has not expired.",
    );
  }
  if (!response.ok) {
    throw new Error(`Could not load user metadata (HTTP ${response.status}).`);
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("The server returned invalid user metadata.");
  }
  const user = isRecord(body) ? body.data : undefined;
  if (
    !isRecord(user) ||
    typeof user.id !== "string" ||
    !user.id ||
    typeof user.username !== "string" ||
    typeof user.tier !== "string" ||
    typeof user.balance !== "number" ||
    !Number.isFinite(user.balance) ||
    typeof user.firstName !== "string" ||
    !isNullableString(user.lastName) ||
    !isNullableString(user.forgejo_username) ||
    !isNullableString(user.forgejo_profile_link)
  ) {
    throw new Error("The server returned invalid user metadata.");
  }
  // Only return the documented public fields, never arbitrary response fields.
  return {
    id: user.id,
    username: user.username,
    tier: user.tier,
    balance: user.balance,
    firstName: user.firstName,
    lastName: user.lastName,
    forgejo_username: user.forgejo_username,
    forgejo_profile_link: user.forgejo_profile_link,
  };
}
