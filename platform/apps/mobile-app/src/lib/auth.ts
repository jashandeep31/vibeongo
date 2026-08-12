import * as SecureStore from "expo-secure-store";
import { BACKEND_URL } from "@/constants/config";

const ACCESS_TOKEN_KEY = "vibeongo.accessToken";

type TokenExchangeResponse = {
  token?: unknown;
  message?: unknown;
};

export async function exchangeMobileToken(exchangeToken: string) {
  const response = await fetch(`${BACKEND_URL}/api/v1/auth/mobile/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token: exchangeToken }),
  });
  const body = (await response.json()) as TokenExchangeResponse;

  if (!response.ok || typeof body.token !== "string") {
    throw new Error(
      typeof body.message === "string" ? body.message : "Token exchange failed",
    );
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, body.token);
  return body.token;
}

export function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function clearAccessToken() {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
