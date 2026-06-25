import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const chats = pgTable("chats", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  user_id: uuid().references(() => users.id, { onDelete: "cascade" }),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const chatQuestions = pgTable("chat_questions", {
  id: uuid().defaultRandom().primaryKey(),
  question: text().notNull(),
  chat_id: uuid().references(() => chats.id, { onDelete: "cascade" }),

  memory: text(),

  order_number: integer().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const chatAnswer = pgTable("chat_answer", {
  id: uuid().defaultRandom().primaryKey(),
  answer: text().notNull(),

  question_id: uuid().references(() => chatQuestions.id, {
    onDelete: "cascade",
  }),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});
