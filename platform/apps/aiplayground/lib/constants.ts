import { INTERNAL_MONEY_SCALE } from "@repo/shared";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://server.vibeongo.com";

export const LOW_BALANCE_THRESHOLD = 5 * INTERNAL_MONEY_SCALE;
