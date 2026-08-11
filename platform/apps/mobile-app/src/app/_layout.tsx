import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import AppTabs from "@/components/app-tabs";
import { LoginScreen } from "@/components/login-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isLoading, token } = useAuth();

  if (isLoading) return null;
  if (!token) return <LoginScreen />;

  return <AppTabs />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
