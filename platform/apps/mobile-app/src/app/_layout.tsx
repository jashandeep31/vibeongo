import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";

import { LoginScreen } from "@/components/login-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

function AppContent() {
  const { isLoading, token } = useAuth();

  if (isLoading) return null;
  if (!token) return <LoginScreen />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
