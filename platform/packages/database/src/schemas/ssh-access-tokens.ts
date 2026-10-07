import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { instances } from "./instances.js";
import { projectSessions } from "./project-sessions.js";
import { users } from "./user.js";

export const sshAccessTokens = pgTable(
  "ssh_access_tokens",
  {
    id: uuid().defaultRandom().primaryKey(),
    token_hash: varchar({ length: 64 }).notNull(),
    user_id: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    project_session_id: uuid()
      .notNull()
      .references(() => projectSessions.id, { onDelete: "cascade" }),
    instance_id: uuid()
      .notNull()
      .references(() => instances.id, { onDelete: "cascade" }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    revoked_at: timestamp({ withTimezone: true }),
    last_used_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    uniqueIndex("ssh_access_tokens_token_hash_idx").on(table.token_hash),
    index("ssh_access_tokens_user_session_idx").on(
      table.user_id,
      table.project_session_id,
    ),
    index("ssh_access_tokens_instance_id_idx").on(table.instance_id),
  ],
);
