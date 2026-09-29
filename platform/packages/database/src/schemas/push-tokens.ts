import {
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const pushTokenPlatform = pgEnum("push_token_platform", [
  "ios",
  "android",
]);

// one row per device, the token is the address used to send push notifications
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),

    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    token: varchar().notNull().unique(),
    platform: pushTokenPlatform().notNull(),

    // os notification permission of the device, synced by the app
    enabled: boolean().notNull().default(true),

    // updated on every sync, used to clean up stale tokens
    last_seen_at: timestamp().defaultNow().notNull(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [index("push_tokens_user_id_idx").on(table.user_id)],
);
