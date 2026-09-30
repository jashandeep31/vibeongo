import {
  useMarkNotificationRead,
  useQueryClient,
  useWebSocket,
} from "@repo/api-hooks";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useIsViewingChat } from "@/hooks/use-is-viewing-chat";
import { playNotificationSound } from "@/lib/notification-sound";
import { showNotificationToast } from "@/lib/notification-toast";
import { dismissNotificationFromTray } from "@/lib/notification-tray";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  payload: { url?: unknown } | null;
};

const isAppNotification = (data: unknown): data is AppNotification =>
  typeof data === "object" &&
  data !== null &&
  typeof (data as AppNotification).id === "string" &&
  typeof (data as AppNotification).title === "string";

// Shows notifications received over the websocket as a toast and marks them
// read, so no push is sent.
export function NotificationListener() {
  const queryClient = useQueryClient();
  const { status, subscribeJsonMessage } = useWebSocket();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const isViewingChat = useIsViewingChat();
  // notifications received while the app was not in the foreground
  const pendingRef = useRef<AppNotification[]>([]);

  // unread count (sidebar dot) and the notifications page, if open
  const refreshUnreadCount = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const showNotification = (notification: AppNotification) => {
    // seen in the app counts as read, even if the toast is ignored
    // (which also cancels the push)
    markNotificationRead(notification.id);

    // already looking at that chat: nothing to announce
    if (isViewingChat(notification.payload?.url)) return;

    showNotificationToast({
      title: notification.title,
      body: notification.body,
      url: notification.payload?.url,
      onOpen: () => void dismissNotificationFromTray(notification.id),
    });
  };
  const showNotificationRef = useRef(showNotification);
  showNotificationRef.current = showNotification;
  const refreshUnreadCountRef = useRef(refreshUnreadCount);
  refreshUnreadCountRef.current = refreshUnreadCount;

  useEffect(() => {
    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type !== "notification" || !isAppNotification(message.data))
        return;

      void refreshUnreadCountRef.current();
      if (AppState.currentState === "active") {
        // also for the chat being viewed (read, no toast)
        playNotificationSound(message.data.id);
        showNotificationRef.current(message.data);
      } else {
        pendingRef.current.push(message.data);
      }
    });

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      void refreshUnreadCountRef.current();
      if (!pendingRef.current.length) return;

      const pending = pendingRef.current;
      pendingRef.current = [];
      // toast shows one at a time, so only the latest is visible
      for (const notification of pending) showNotificationRef.current(notification);
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [subscribeJsonMessage]);

  // catch up after every (re)connect: notifications sent while offline
  // show up in the unread count and on the notifications page
  useEffect(() => {
    if (status === "connected") void refreshUnreadCountRef.current();
  }, [status]);

  return null;
}
