import { Redis } from "iovalkey";
import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL);
