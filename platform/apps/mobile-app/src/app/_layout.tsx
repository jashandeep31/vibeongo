import { DarkTheme, Stack, ThemeProvider } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { LoginScreen } from "@/components/login-screen";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ToastProvider } from "@/contexts/toast-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { useTheme } from "@/hooks/use-theme";

function AppContent() {
  const { isLoading, token } = useAuth();
  const colors = useTheme();

  if (isLoading) return null;
  if (!token) return <LoginScreen />;

  return (
    <WebSocketProvider>
      <Stack
        screenOptions={{
          animation: "ios_from_right",
          animationDuration: 280,
          animationMatchesGesture: true,
          contentStyle: { backgroundColor: colors.background },
          gestureEnabled: true,
          headerShown: false,
        }}
      />
    </WebSocketProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={DarkTheme}>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
