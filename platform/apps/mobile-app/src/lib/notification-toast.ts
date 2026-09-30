import { router, type Href } from "expo-router";
import Toast from "react-native-toast-message";

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
    onPress: () => {
      Toast.hide();
      onOpen?.();
      if (typeof url === "string") router.push(url as Href);
    },
  });
}
