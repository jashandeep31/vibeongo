import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// --- database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle({ client: pool });

export * from "drizzle-orm";
export * from "./schemas/temp-ec2.js";
export * from "./schemas/user.js";
export * from "./schemas/github-repos.js";
export * from "./schemas/environments.js";
export * from "./schemas/instances.js";
export * from "./schemas/projects.js";
export * from "./schemas/project-sessions.js";
export * from "./schemas/instances-metadata.js";
export * from "./schemas/ssh-key.js";
export * from "./schemas/auth-tokens.js";
