import { useUpsertPushToken } from "@repo/api-hooks";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";

import { setRegisteredPushToken } from "@/lib/push-token";

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Registers this device's push token with the server and keeps its
// notification permission in sync (on launch and every foreground).
export function PushTokenSync() {
  const { mutateAsync: upsertPushToken } = useUpsertPushToken();
  const upsertRef = useRef(upsertPushToken);
  upsertRef.current = upsertPushToken;
  // ask for permission at most once per app session
  const askedRef = useRef(false);

  useEffect(() => {
    if (!Device.isDevice) return;
    if (Platform.OS !== "ios" && Platform.OS !== "android") return;
    const platform = Platform.OS;

    let syncing = false;

    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        // android 13+ only shows the permission prompt once a channel exists
        if (platform === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.HIGH,
          });
        }

        let permission = await Notifications.getPermissionsAsync();
        if (
          !permission.granted &&
          permission.canAskAgain &&
          !askedRef.current
        ) {
          askedRef.current = true;
          permission = await Notifications.requestPermissionsAsync();
        }

        const projectId = getProjectId();
        if (!projectId) return;

        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        await upsertRef.current({
          token,
          platform,
          enabled: permission.granted,
        });
        await setRegisteredPushToken(token);
      } catch (error) {
        // no network or token unavailable, retried on next foreground
        console.log("Push token sync failed", error);
      } finally {
        syncing = false;
      }
    };

    void sync();

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void sync();
    });

    return () => subscription.remove();
  }, []);

  return null;
}
