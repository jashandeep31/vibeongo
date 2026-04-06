import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { projectSessions } from "./project-sessions.js";

export const sessionAuthTokens = pgTable("session_auth_tokens", {
  id: uuid().primaryKey().defaultRandom().notNull(),

  session_id: uuid()
    .references(() => projectSessions.id, {
      onDelete: "cascade",
    })
    .notNull(),

  token: varchar({ length: 255 }).notNull(),
  expires_at: timestamp(),

  created_at: timestamp().defaultNow(),
  updated_at: timestamp().defaultNow(),
});
