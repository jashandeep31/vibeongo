import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BACKEND_URL } from "@/constants/config";
import { useTheme } from "@/hooks/use-theme";
import { exchangeMobileToken } from "@/lib/auth";

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "vibeongo",
  path: "auth/callback",
});

WebBrowser.maybeCompleteAuthSession();

export function SignedOutScreen() {
  const theme = useTheme();
  const [isExchangingToken, setIsExchangingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const discovery = useMemo(
    () => ({
      authorizationEndpoint: `${BACKEND_URL}/api/v1/auth/github`,
    }),
    [],
  );
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "vibeongo-mobile",
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: false,
    },
    discovery,
  );

  useEffect(() => {
    if (!response) return;
    if (response.type !== "success") {
      if (response.type === "error") {
        setError(response.error?.message ?? "GitHub sign-in failed.");
      }
      return;
    }

    const token = response.params.token;
    if (!token) {
      setError("The authentication callback did not include a token.");
      return;
    }

    setError(null);
    setIsExchangingToken(true);
    void exchangeMobileToken(token)
      .catch((exchangeError: unknown) => {
        setError(
          exchangeError instanceof Error
            ? exchangeError.message
            : "GitHub sign-in failed.",
        );
      })
      .finally(() => setIsExchangingToken(false));
  }, [response]);

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
          disabled={!request || isExchangingToken}
          onPress={() => void signIn()}
          style={({ pressed }) => [
            styles.githubButton,
            (!request || isExchangingToken) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {isExchangingToken ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <ThemedText style={styles.githubButtonText}>
              Continue with GitHub
            </ThemedText>
          )}
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
