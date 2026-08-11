import { getStoredToken } from "@/lib/token-storage";
import { Platform } from "react-native";

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL;
const DEVELOPMENT_USER_ID = "634c805d-c70a-4333-9214-65d3fafc9481";
const developmentApiUrl =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

export const API_URL = (
  configuredApiUrl ||
  (__DEV__ ? developmentApiUrl : "https://server.vibeongo.com")
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

  return fetch(`${API_URL}${path}`, { ...init, headers });
}
