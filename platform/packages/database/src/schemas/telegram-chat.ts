import { pgTable, uuid, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const telegramBotChat = pgTable("telegram_bot_chat", {
  id: uuid().unique().defaultRandom().notNull(),

  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  state: varchar().notNull().unique(),
  metadata: jsonb(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});
