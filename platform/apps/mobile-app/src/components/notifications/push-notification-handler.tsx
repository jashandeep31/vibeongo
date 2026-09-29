import {
  UNREAD_NOTIFICATION_COUNT_QUERY_KEY,
  useMarkNotificationRead,
  useQueryClient,
} from "@repo/api-hooks";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect, useRef } from "react";

import { showNotificationToast } from "@/lib/notification-toast";

// a push that arrives while the app is open is shown as the in-app toast
// instead of a system banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const getNotificationId = (notification: Notifications.Notification) => {
  const id = notification.request.content.data?.notificationId;
  return typeof id === "string" ? id : null;
};

// Handles push notifications: marks them read when tapped (also when the tap
// launched the app) and opens their url. One received in the foreground is
// shown as a toast and stays unread until the toast is tapped.
export function PushNotificationHandler() {
  const queryClient = useQueryClient();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const markReadRef = useRef(markNotificationRead);
  markReadRef.current = markNotificationRead;
  // the same response can come from both the listener and the last response
  const handledRef = useRef(new Set<string>());

  useEffect(() => {
    const markRead = (notification: Notifications.Notification) => {
      const id = getNotificationId(notification);
      if (!id || handledRef.current.has(id)) return false;

      handledRef.current.add(id);
      // http instead of websocket, the socket may not be connected yet
      markReadRef.current(id);
      return true;
    };

    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (
        response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        return;
      }

      const { notification } = response;
      if (!markRead(notification)) return;
      Notifications.clearLastNotificationResponse();

      const url = notification.request.content.data?.url;
      if (typeof url === "string") router.push(url as Href);
    };

    // tap that launched the app from a closed state
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) handleResponse(lastResponse);

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        void queryClient.invalidateQueries({
          queryKey: UNREAD_NOTIFICATION_COUNT_QUERY_KEY,
        });

        const { title, body, data } = notification.request.content;
        showNotificationToast({
          title: title ?? "Notification",
          body,
          url: data?.url,
          onOpen: () => markRead(notification),
        });
      },
    );

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [queryClient]);

  return null;
}
