import * as Notifications from "expo-notifications";

// Removes pushes from the system tray once they are read in the app.
// Failures are ignored: a leftover tray entry is only cosmetic.

// all of this app's pushes, e.g. when the notifications page is opened
export async function clearNotificationTray() {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}

// the push of a single notification, matched by the id the server sends
export async function dismissNotificationFromTray(notificationId: string) {
  try {
    const presented = await Notifications.getPresentedNotificationsAsync();
    await Promise.all(
      presented
        .filter(
          (notification) =>
            notification.request.content.data?.notificationId ===
            notificationId,
        )
        .map((notification) =>
          Notifications.dismissNotificationAsync(
            notification.request.identifier,
          ),
        ),
    );
  } catch {
    // ignore
  }
}
