import { getStoredToken } from "@/lib/token-storage";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = (
  configuredApiUrl || "https://server.vibeongo.com"
).replace(/\/$/, "");

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
) {
  const token = accessToken ?? (await getStoredToken());
  const headers = new Headers(init.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_URL}${path}`, { ...init, headers });
}
