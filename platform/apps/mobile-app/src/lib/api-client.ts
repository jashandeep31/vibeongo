import { MobileClient } from "@repo/api-client";
import { BACKEND_URL } from "@/constants/config";

export function createApiClient(token: string) {
  return new MobileClient(BACKEND_URL, token);
}
