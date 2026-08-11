import * as SecureStore from "expo-secure-store";

const SESSION_TOKEN_KEY = "vibeongo-session-token";

export const getStoredToken = () => SecureStore.getItemAsync(SESSION_TOKEN_KEY);

export const storeToken = (token: string) =>
  SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);

export const removeStoredToken = () =>
  SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
