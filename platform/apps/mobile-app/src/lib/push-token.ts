import * as SecureStore from "expo-secure-store";

// the push token last registered with the server for the signed in user,
// kept so sign out can unregister it without asking expo for it again
const PUSH_TOKEN_KEY = "vibeongo.pushToken";

export function getRegisteredPushToken() {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export function setRegisteredPushToken(token: string) {
  return SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
}

export function clearRegisteredPushToken() {
  return SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}
