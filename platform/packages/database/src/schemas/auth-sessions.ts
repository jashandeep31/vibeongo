import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const authClientType = pgEnum("auth_client_type", ["web", "mobile"]);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid().primaryKey().defaultRandom(),

    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    token_hash: varchar({ length: 128 }).notNull().unique(),
    client_type: authClientType().notNull(),

    expires_at: timestamp().notNull(),
    revoked_at: timestamp(),

    created_at: timestamp().defaultNow().notNull(),
    last_used_at: timestamp(),
    user_agent: text(),
    ip_address: varchar(),
  },
  (table) => [
    index("auth_sessions_user_id_idx").on(table.user_id),
    index("auth_sessions_expires_at_idx").on(table.expires_at),
  ],
);
