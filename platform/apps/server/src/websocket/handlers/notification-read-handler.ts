import { and, db, eq, inArray, isNull, notifications } from "@repo/db";
import WebSocket from "ws";
import { z } from "zod";
import { sendWSError } from "../socket-handler.js";

export const notificationReadHandler = async (
  socket: WebSocket,
  data: unknown,
) => {
  const parsingDataResponse = z.object({ id: z.uuid() }).safeParse(data);
  if (parsingDataResponse.error) {
    sendWSError(socket, "not a valid notification id");
    return;
  }
  const { id } = parsingDataResponse.data;

  const now = new Date();
  await db
    .update(notifications)
    .set({ status: "read", read_at: now, updated_at: now })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.user_id, socket.userId),
        isNull(notifications.read_at),
      ),
    );
};

// the app showed the notification in-app: no push needed, but it stays
// unread until the user opens it or the notifications page
export const notificationDeliveredHandler = async (
  socket: WebSocket,
  data: unknown,
) => {
  const parsingDataResponse = z.object({ id: z.uuid() }).safeParse(data);
  if (parsingDataResponse.error) {
    sendWSError(socket, "not a valid notification id");
    return;
  }
  const { id } = parsingDataResponse.data;

  const now = new Date();
  await db
    .update(notifications)
    .set({ status: "delivered", delivered_at: now, updated_at: now })
    .where(
      and(
        eq(notifications.id, id),
        eq(notifications.user_id, socket.userId),
        inArray(notifications.status, ["queued", "sent_ws"]),
      ),
    );
};
