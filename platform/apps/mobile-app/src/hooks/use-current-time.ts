import { useEffect, useState } from "react";
import { AppState } from "react-native";

export function useCurrentTime(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let active = AppState.currentState === "active";
    const tick = () => {
      setNow(Date.now());
      if (active) timeout = setTimeout(tick, 1000);
    };
    if (active) timeout = setTimeout(tick, 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      clearTimeout(timeout);
      active = state === "active";
      if (active) tick();
    });
    return () => {
      clearTimeout(timeout);
      subscription.remove();
    };
  }, [enabled]);

  return now;
}
