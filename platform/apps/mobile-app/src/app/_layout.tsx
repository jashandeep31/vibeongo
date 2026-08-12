import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useTheme } from "@/hooks/use-theme";
import { AppProviders } from "@/providers/app-providers";

export default function RootLayout() {
  const theme = useTheme();

  return (
    <AppProviders>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerShown: false,
        }}
      />
      <StatusBar style="auto" />
    </AppProviders>
  );
}
