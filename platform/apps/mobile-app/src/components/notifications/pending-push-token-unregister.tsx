import { useEffect } from "react";
import { AppState } from "react-native";

import {
  clearPendingPushTokenUnregister,
  getPendingPushTokenUnregister,
  unregisterPushToken,
} from "@/lib/push-token";

// Retries removing a push token that sign out could not remove (e.g. it was
// offline), so this device stops getting the old user's pushes. Runs signed
// in or out, on launch and every foreground.
export function PendingPushTokenUnregister() {
  useEffect(() => {
    let running = false;

    const retry = async () => {
      if (running) return;
      running = true;
      try {
        const token = await getPendingPushTokenUnregister();
        if (!token) return;

        await unregisterPushToken(token);
        await clearPendingPushTokenUnregister();
      } catch {
        // still offline, try again next time
      } finally {
        running = false;
      }
    };

    void retry();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void retry();
    });

    return () => subscription.remove();
  }, []);

  return null;
}
