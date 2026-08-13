import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";

export type ThemePreference = "light" | "dark" | "system";

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const THEME_PREFERENCE_KEY = "vibeongo.themePreference";
const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: "system",
  setPreference: async () => undefined,
});

function applyThemePreference(preference: ThemePreference) {
  Appearance.setColorScheme(
    preference === "system" ? "unspecified" : preference,
  );
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync(THEME_PREFERENCE_KEY)
      .then((stored) => {
        const next =
          stored === "light" || stored === "dark" ? stored : "system";
        if (!active) return;
        setPreferenceState(next);
        applyThemePreference(next);
      })
      .catch(() => applyThemePreference("system"));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      preference,
      setPreference: async (next) => {
        setPreferenceState(next);
        applyThemePreference(next);
        await SecureStore.setItemAsync(THEME_PREFERENCE_KEY, next);
      },
    }),
    [preference],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
