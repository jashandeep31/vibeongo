import { useWebSocket } from "@repo/api-hooks";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import Toast from "react-native-toast-message";

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

// Shows notifications received over the websocket and marks them as read
// once the user has seen them (app in foreground).
export function NotificationListener() {
  const { sendJsonMessage, subscribeJsonMessage } = useWebSocket();
  // notifications received while the app was not in the foreground
  const pendingRef = useRef<AppNotification[]>([]);

  useEffect(() => {
    const showNotification = (notification: AppNotification) => {
      const url = notification.payload?.url;

      Toast.show({
        type: "info",
        text1: notification.title,
        text2: notification.body ?? undefined,
        onPress: () => {
          Toast.hide();
          if (typeof url === "string") router.push(url as Href);
        },
      });

      sendJsonMessage({
        type: "notification-read",
        data: { id: notification.id },
      });
    };

    const unsubscribe = subscribeJsonMessage((message) => {
      if (message.type !== "notification" || !isAppNotification(message.data))
        return;

      if (AppState.currentState === "active") {
        showNotification(message.data);
      } else {
        pendingRef.current.push(message.data);
      }
    });

    const appStateSubscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !pendingRef.current.length) return;

      const pending = pendingRef.current;
      pendingRef.current = [];
      // toast shows one at a time, so only the latest is visible
      // but every pending notification counts as seen
      for (const notification of pending) showNotification(notification);
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [sendJsonMessage, subscribeJsonMessage]);

  return null;
}
