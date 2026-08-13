import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppToastHost } from "@/components/app-toast";
import { useTheme } from "@/hooks/use-theme";
import { AppProviders } from "@/providers/app-providers";
import { ThemePreferenceProvider } from "@/providers/theme-preference-provider";

export default function RootLayout() {
  return (
    <ThemePreferenceProvider>
      <RootNavigator />
    </ThemePreferenceProvider>
  );
}

function RootNavigator() {
  const theme = useTheme();

  return (
    <>
      <AppProviders>
        <Stack
          screenOptions={{
            contentStyle: { backgroundColor: theme.background },
            headerShown: false,
          }}
        />
        <StatusBar style="auto" />
      </AppProviders>
      <AppToastHost />
    </>
  );
}
