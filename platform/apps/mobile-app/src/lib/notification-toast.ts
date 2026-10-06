import { router, type Href } from "expo-router";
import Toast from "react-native-toast-message";

// longer than the app's default toast, so there is time to read and tap it
const NOTIFICATION_TOAST_DURATION_MS = 6_000;

// in-app toast for a notification, tapping it opens its url if any
export function showNotificationToast({
  title,
  body,
  url,
  onOpen,
}: {
  title: string;
  body?: string | null;
  url?: unknown;
  onOpen?: () => void;
}) {
  Toast.show({
    type: "info",
    text1: title,
    text2: body ?? undefined,
    visibilityTime: NOTIFICATION_TOAST_DURATION_MS,
    onPress: () => {
      Toast.hide();
      onOpen?.();
      if (typeof url === "string") router.push(url as Href);
    },
  });
}
