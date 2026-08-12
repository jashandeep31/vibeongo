import type { NotificationPermissionsStatus } from "expo-notifications/build/NotificationPermissions.types";
import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

const TEST_NOTIFICATION_CHANNEL = "action-required";

function permissionIsGranted(
  permissions: NotificationPermissionsStatus,
  iosAuthorizationStatus: {
    AUTHORIZED: number;
    EPHEMERAL: number;
    PROVISIONAL: number;
  },
) {
  if (permissions.granted) return true;
  const iosStatus = permissions.ios?.status;
  return (
    iosStatus === iosAuthorizationStatus.AUTHORIZED ||
    iosStatus === iosAuthorizationStatus.PROVISIONAL ||
    iosStatus === iosAuthorizationStatus.EPHEMERAL
  );
}

export async function sendTestDeviceNotification() {
  if (Platform.OS === "web") {
    throw new Error("Device notifications are available on iOS and Android.");
  }

  // Avoid the package's top-level entry because it initializes remote push
  // token support, which Android Expo Go intentionally does not include.
  const [
    { setNotificationHandler },
    { getPermissionsAsync, requestPermissionsAsync },
    { IosAuthorizationStatus },
    { setNotificationChannelAsync },
    { AndroidImportance },
    { scheduleNotificationAsync },
  ] = await Promise.all([
    import("expo-notifications/build/NotificationsHandler"),
    import("expo-notifications/build/NotificationPermissions"),
    import("expo-notifications/build/NotificationPermissions.types"),
    import("expo-notifications/build/setNotificationChannelAsync"),
    import("expo-notifications/build/NotificationChannelManager.types"),
    import("expo-notifications/build/scheduleNotificationAsync"),
  ]);

  setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  let customAndroidChannelReady = false;
  if (Platform.OS === "android" && !isRunningInExpoGo()) {
    try {
      await setNotificationChannelAsync(TEST_NOTIFICATION_CHANNEL, {
        name: "Action required",
        description: "Notifications for chats that need your attention.",
        importance: AndroidImportance.MAX,
        vibrationPattern: [0, 250, 150, 250],
        lightColor: "#6D5DFC",
        sound: "default",
      });
      customAndroidChannelReady = true;
    } catch {
      // Local notifications can still use Android's fallback channel.
    }
  }

  let permissions = await getPermissionsAsync();
  if (!permissionIsGranted(permissions, IosAuthorizationStatus)) {
    permissions = await requestPermissionsAsync();
  }
  if (!permissionIsGranted(permissions, IosAuthorizationStatus)) {
    throw new Error(
      "Notification permission was denied. Enable it in your device settings and try again.",
    );
  }

  await scheduleNotificationAsync({
    content: {
      title: "Action required",
      body: "Chat X needs an action.",
      data: { source: "sidebar-test", type: "action-required" },
      sound: "default",
    },
    trigger:
      Platform.OS === "android" && customAndroidChannelReady
        ? { channelId: TEST_NOTIFICATION_CHANNEL }
        : null,
  });
}
