import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/hooks/use-theme';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.background },
          headerShown: false,
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}
