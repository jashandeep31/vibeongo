import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useCurrentTime } from "@/hooks/use-current-time";
import {
  INSTANCE_EXPIRY_WARNING_MS,
  formatInstanceTimeRemaining,
  getInstanceRemainingMs,
  isInstanceExpiringSoon,
} from "@/lib/instance-expiry";

type ExpiryValue = Date | number | string | null | undefined;

export function useInstanceExpiryWarning(terminatesAt: ExpiryValue) {
  const [isExpiring, setIsExpiring] = useState(() =>
    isInstanceExpiringSoon(getInstanceRemainingMs(terminatesAt, Date.now())),
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = () => {
      clearTimeout(timer);
      const remaining = getInstanceRemainingMs(terminatesAt, Date.now());
      setIsExpiring(isInstanceExpiringSoon(remaining));
      if (remaining === null || remaining <= 0) return;
      if (remaining > INSTANCE_EXPIRY_WARNING_MS) {
        timer = setTimeout(
          update,
          Math.min(remaining - INSTANCE_EXPIRY_WARNING_MS, 2_147_483_647),
        );
      }
    };

    update();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
      else clearTimeout(timer);
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [terminatesAt]);

  return isExpiring;
}

export function InstanceExpiryCountdown({
  style,
  terminatesAt,
}: {
  style?: React.ComponentProps<typeof ThemedText>["style"];
  terminatesAt: ExpiryValue;
}) {
  const now = useCurrentTime(Boolean(terminatesAt));
  return (
    <ThemedText style={style}>
      {formatInstanceTimeRemaining(getInstanceRemainingMs(terminatesAt, now))}
    </ThemedText>
  );
}
