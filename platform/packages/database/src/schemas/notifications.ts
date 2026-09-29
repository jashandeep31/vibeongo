import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./user.js";

// queued -> sent_ws -> delivered -> read
// queued / sent_ws -> pushed (no ack before push_after) -> read
export const notificationStatus = pgEnum("notification_status", [
  "queued",
  "sent_ws",
  "delivered",
  "pushed",
  "read",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),

    user_id: uuid()
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    type: varchar().notNull(),
    title: varchar().notNull(),
    body: text(),
    // extra data for the client, e.g. deep link url
    payload: jsonb(),

    status: notificationStatus().default("queued").notNull(),

    // if not acked by this time, fallback to push notification
    push_after: timestamp().notNull(),

    delivered_at: timestamp(),
    pushed_at: timestamp(),
    read_at: timestamp(),

    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow(),
  },
  (table) => [
    index("notifications_user_id_created_at_idx").on(
      table.user_id,
      table.created_at,
    ),
    index("notifications_status_push_after_idx").on(
      table.status,
      table.push_after,
    ),
  ],
);
