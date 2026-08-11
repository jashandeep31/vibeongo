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

  return fetch(`${BACKEND_URL}${path}`, { ...init, headers });
}
