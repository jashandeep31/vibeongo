export const BACKEND_URL = (
  process.env.EXPO_PUBLIC_BACKEND_URL || "https://server.vibeongo.com"
).replace(/\/$/, "");
