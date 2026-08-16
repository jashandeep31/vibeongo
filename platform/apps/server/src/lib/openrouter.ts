import axios from "axios";
import { env } from "./env.js";

export const openRouterManagementInterface = axios.create({
  baseURL: env.OPENROUTER_API_ENDPOINT,
  headers: {
    Authorization: `Bearer ${env.OPENROUTER_MANAGEMENT_KEY}`,
  },
});
