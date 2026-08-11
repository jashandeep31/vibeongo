import { getStoredToken } from "@/lib/token-storage";

const DEVELOPMENT_USER_ID = "634c805d-c70a-4333-9214-65d3fafc9481";

export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || "https://server.vibeongo.com"
).replace(/\/$/, "");

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const token = accessToken ?? (await getStoredToken());
  const headers = new Headers(init.headers);

  if (__DEV__) {
    headers.set("X-Development-User-Id", DEVELOPMENT_USER_ID);
  } else if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  return fetch(`${BACKEND_URL}${path}`, { ...init, headers });
}

type ApiEnvelope<T> = {
  data: T;
  message?: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiFetch(path, { ...init, signal });
  const body = (await response.json().catch(() => null)) as
    | ApiEnvelope<T>
    | { error?: string; message?: string }
    | null;

  if (!response.ok) {
    const message =
      body && "message" in body && body.message
        ? body.message
        : body && "error" in body && body.error
          ? body.error
          : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  if (!body || !("data" in body)) {
    throw new ApiError(
      "The server returned an invalid response.",
      response.status,
    );
  }

  return body.data;
}
