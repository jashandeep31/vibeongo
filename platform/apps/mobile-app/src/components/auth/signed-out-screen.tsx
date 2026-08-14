import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BACKEND_URL } from "@/constants/config";
import { useTheme } from "@/hooks/use-theme";

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "vibeongo",
  path: "auth/callback",
});

WebBrowser.maybeCompleteAuthSession();

export function SignedOutScreen() {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const discovery = useMemo(
    () => ({
      authorizationEndpoint: `${BACKEND_URL}/api/v1/auth/github`,
    }),
    [],
  );
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "vibeongo-mobile",
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    discovery,
  );

  const signIn = async () => {
    setError(null);
    try {
      await promptAsync();
    } catch {
      setError("Could not open GitHub sign-in. Please try again.");
    }
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <View style={styles.content}>
        <ThemedText style={styles.brand}>VibeOnGo</ThemedText>
        <ThemedText style={styles.description} themeColor="textSecondary">
          Sign in to access your chats and projects.
        </ThemedText>

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <Pressable
          accessibilityRole="button"
          disabled={!request}
          onPress={() => void signIn()}
          style={({ pressed }) => [
            styles.githubButton,
            !request && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText style={styles.githubButtonText}>
            Continue with GitHub
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  brand: { fontSize: 32, fontWeight: "700", letterSpacing: -1 },
  content: {
    alignItems: "center",
    gap: 16,
    maxWidth: 420,
    paddingHorizontal: 24,
    width: "100%",
  },
  description: { fontSize: 15, textAlign: "center" },
  disabled: { opacity: 0.5 },
  error: { color: "#ef4444", textAlign: "center" },
  githubButton: {
    alignItems: "center",
    backgroundColor: "#24292f",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 50,
    paddingHorizontal: 24,
    width: "100%",
  },
  githubButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.72 },
  screen: { alignItems: "center", flex: 1, justifyContent: "center" },
});
