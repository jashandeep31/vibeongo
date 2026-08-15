import { WebClient } from "@repo/api-client";
import { BACKEND_URL } from "./constants";

export const apiClient = new WebClient(BACKEND_URL);
