import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

export const chatAgentEnum = pgEnum("chat_agent_enum", [
  "project-handler",
  "tasks-maker",
]);

export const chats = pgTable("chats", {
  id: uuid().defaultRandom().primaryKey(),
  name: varchar().notNull(),
  user_id: uuid()
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),

  chat_agent: chatAgentEnum().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const chatQuestions = pgTable("chat_questions", {
  id: uuid().defaultRandom().primaryKey(),
  question: text().notNull(),
  chat_id: uuid()
    .references(() => chats.id, { onDelete: "cascade" })
    .notNull(),

  order_number: integer().notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});

export const chatAnswer = pgTable("chat_answer", {
  id: uuid().defaultRandom().primaryKey(),
  answer: text().notNull(),
  reasoning: text(),

  finish_reason: text(),
  usage: jsonb(),
  steps: jsonb(),

  // Nothing related to the AI SDK in this internally getting used data is saved
  memory: text(),

  question_id: uuid()
    .references(() => chatQuestions.id, {
      onDelete: "cascade",
    })
    .notNull(),

  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
});
