import * as SecureStore from "expo-secure-store";

import { BACKEND_URL } from "@/constants/config";

// the push token last registered with the server for the signed in user,
// kept so sign out can unregister it without asking expo for it again
const PUSH_TOKEN_KEY = "vibeongo.pushToken";
// a token sign out could not remove from the server (e.g. offline),
// retried later without a login
const PENDING_UNREGISTER_KEY = "vibeongo.pushTokenPendingUnregister";

export function getRegisteredPushToken() {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export function setRegisteredPushToken(token: string) {
  return SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export function clearRegisteredPushToken() {
  return SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export function getPendingPushTokenUnregister() {
  return SecureStore.getItemAsync(PENDING_UNREGISTER_KEY);
}

export function setPendingPushTokenUnregister(token: string) {
  return SecureStore.setItemAsync(PENDING_UNREGISTER_KEY, token);
}

export function clearPendingPushTokenUnregister() {
  return SecureStore.deleteItemAsync(PENDING_UNREGISTER_KEY);
}

// public route, works while signed out: the token itself identifies the device
export async function unregisterPushToken(token: string) {
  const response = await fetch(
    `${BACKEND_URL}/api/v1/notifications/push-tokens/unregister`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
  );
  if (!response.ok) {
    throw new Error(`Push token unregister failed: ${response.status}`);
  }
}
