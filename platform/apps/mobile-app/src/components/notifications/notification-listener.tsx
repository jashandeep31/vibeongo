import {
  useMarkNotificationRead,
  useQueryClient,
  useWebSocket,
} from "@repo/api-hooks";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useIsViewingChat } from "@/hooks/use-is-viewing-chat";
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

// Shows notifications received over the websocket as a toast and tells the
// server they were delivered (no push needed). They stay unread until the
// toast is tapped or the notifications page is opened.
export function NotificationListener() {
  const queryClient = useQueryClient();
  const { sendJsonMessage, status, subscribeJsonMessage } = useWebSocket();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const isViewingChat = useIsViewingChat();
  // notifications received while the app was not in the foreground
  const pendingRef = useRef<AppNotification[]>([]);

  // unread count (sidebar dot) and the notifications page, if open
  const refreshUnreadCount = () =>
    queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const showNotification = (notification: AppNotification) => {
    // already looking at that chat: nothing to announce, it counts as read
    // (which also cancels the push)
    if (isViewingChat(notification.payload?.url)) {
      markNotificationRead(notification.id);
      return;
    }

    showNotificationToast({
      title: notification.title,
      body: notification.body,
      url: notification.payload?.url,
      onOpen: () => {
        markNotificationRead(notification.id);
        void dismissNotificationFromTray(notification.id);
      },
    });

    sendJsonMessage({
      type: "notification-delivered",
      data: { id: notification.id },
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
