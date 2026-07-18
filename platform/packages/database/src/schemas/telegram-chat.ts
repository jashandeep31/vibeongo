import {
  bigint,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { projects } from "./projects.js";

export const telegramBotChat = pgTable("telegram_bot_chat", {
  id: uuid().unique().defaultRandom().notNull(),

  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),

  state: varchar().notNull(),
  metadata: jsonb(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow(),
});

export const telegramBotChatSession = pgTable(
  "telegram_bot_chat_session",
  {
    id: uuid().defaultRandom().primaryKey(),
    telegram_chat_id: bigint({ mode: "number" }).notNull(),
    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    project_id: uuid()
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("telegram_bot_chat_session_user_project_idx").on(
      table.user_id,
      table.project_id,
    ),
  ],
);

export const telegramBotChatSessionMessageRole = pgEnum(
  "telegram_bot_chat_session_message_role",
  ["user", "bot"],
);

export const telegramBotChatSessionMessage = pgTable(
  "telegram_bot_chat_session_message",
  {
    id: uuid().defaultRandom().primaryKey(),
    session_id: uuid()
      .references(() => telegramBotChatSession.id, { onDelete: "cascade" })
      .notNull(),
    telegram_chat_id: bigint({ mode: "number" }).notNull(),
    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: telegramBotChatSessionMessageRole().notNull(),
    text: text().notNull(),
    created_at: timestamp().defaultNow().notNull(),
  },
  (table) => [
    index("telegram_bot_chat_session_message_context_idx").on(
      table.session_id,
      table.created_at,
    ),
  ],
);
