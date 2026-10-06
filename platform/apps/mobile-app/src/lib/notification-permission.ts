import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, Platform } from "react-native";

const permissionListeners = new Set<() => void>();

// lets the push token sync pick up a permission granted inside the app
export function subscribeNotificationPermissionChange(listener: () => void) {
  permissionListeners.add(listener);
  return () => {
    permissionListeners.delete(listener);
  };
}

const notifyNotificationPermissionChange = () => {
  for (const listener of permissionListeners) listener();
};

// opens this app's notification settings, falls back to the app settings
export async function openNotificationSettings() {
  const androidPackage = Constants.expoConfig?.android?.package;
  if (Platform.OS === "android" && androidPackage) {
    try {
      await Linking.sendIntent("android.settings.APP_NOTIFICATION_SETTINGS", [
        { key: "android.provider.extra.APP_PACKAGE", value: androidPackage },
      ]);
      return;
    } catch {
      // older android versions, open the app settings instead
    }
  }
  await Linking.openSettings();
}

type PermissionState = {
  granted: boolean;
  canAskAgain: boolean;
};

// os notification permission, refreshed whenever the app comes to foreground
export function useNotificationPermission() {
  const [permission, setPermission] = useState<PermissionState | null>(null);

  const refresh = useCallback(async () => {
    if (!Device.isDevice) return;
    try {
      const { granted, canAskAgain } =
        await Notifications.getPermissionsAsync();
      setPermission({ granted, canAskAgain });
    } catch {
      // keep the last known state
    }
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  // shows the os prompt while it still can, otherwise opens the settings
  const enable = useCallback(async () => {
    if (permission?.canAskAgain) {
      const { granted, canAskAgain } =
        await Notifications.requestPermissionsAsync();
      setPermission({ granted, canAskAgain });
      if (granted) notifyNotificationPermissionChange();
      return;
    }
    await openNotificationSettings();
  }, [permission?.canAskAgain]);

  return { permission, enable };
}
