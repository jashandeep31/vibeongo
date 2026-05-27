import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createInstances } from "./seed/instances.seed.js";

export type Transaction = Parameters<
  Parameters<(typeof db)["transaction"]>[0]
>[0];
// --- database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});
export const db = drizzle({ client: pool, logger: false });
createInstances();
export * from "drizzle-orm";
export { PgSelectBase, type PgSelect } from "drizzle-orm/pg-core";
export * from "./schemas/temp-ec2.js";
export * from "./schemas/proxy-domains.js";
export * from "./schemas/user.js";
export * from "./schemas/github-repos.js";
export * from "./schemas/environments.js";
export * from "./schemas/instances.js";
export * from "./schemas/projects.js";
export * from "./schemas/project-domain-routing.js";
export * from "./schemas/project-sessions.js";
export * from "./schemas/instances-metadata.js";
export * from "./schemas/ssh-key.js";
export * from "./schemas/session-auth-tokens.js";
