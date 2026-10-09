import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const emailAuthChallenges = pgTable(
  "email_auth_challenges",
  {
    id: uuid().primaryKey(),
    user_id: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    purpose: varchar({ length: 32 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    otp_digest: varchar({ length: 64 }).notNull(),
    staged_password_hash: text(),
    staged_name: varchar({ length: 100 }),
    attempt_count: integer().notNull().default(0),
    delivery_status: varchar({ length: 16 }).notNull().default("pending"),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    expires_at: timestamp({ withTimezone: true }).notNull(),
    consumed_at: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("email_auth_challenges_user_purpose_idx").on(
      table.user_id,
      table.purpose,
    ),
    index("email_auth_challenges_expiry_idx").on(table.expires_at),
  ],
);
