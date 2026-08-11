const SESSION_TOKEN_KEY = "vibeongo-session-token";

export const getStoredToken = async () =>
  localStorage.getItem(SESSION_TOKEN_KEY);

export const storeToken = async (token: string) =>
  localStorage.setItem(SESSION_TOKEN_KEY, token);

export const removeStoredToken = async () =>
  localStorage.removeItem(SESSION_TOKEN_KEY);
