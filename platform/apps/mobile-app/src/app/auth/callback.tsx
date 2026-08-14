import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { exchangeMobileToken } from "@/lib/auth";

const MOBILE_PKCE_KEY = "vibeongo.mobilePkce";

type StoredMobilePkce = {
  codeVerifier: string;
  state: string;
};

export default function AuthCallbackScreen() {
  const { token, state } = useLocalSearchParams<{
    token?: string;
    state?: string;
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const hasStartedExchange = useRef(false);

  useEffect(() => {
    if (!token || !state) {
      setError("The authentication callback did not include a token.");
      return;
    }
    if (hasStartedExchange.current) return;
    hasStartedExchange.current = true;

    void SecureStore.getItemAsync(MOBILE_PKCE_KEY)
      .then((storedValue) => {
        if (!storedValue) throw new Error("This sign-in request has expired.");
        const stored = JSON.parse(storedValue) as StoredMobilePkce;
        if (stored.state !== state || !stored.codeVerifier) {
          throw new Error("This callback does not match the sign-in request.");
        }
        return exchangeMobileToken(token, state, stored.codeVerifier);
      })
      .then(async () => {
        await SecureStore.deleteItemAsync(MOBILE_PKCE_KEY);
        router.replace("/");
      })
      .catch((exchangeError: unknown) => {
        setError(
          exchangeError instanceof Error
            ? exchangeError.message
            : "Authentication failed.",
        );
      });
  }, [router, state, token]);

  return (
    <ThemedView style={styles.container}>
      {error ? (
        <>
          <ThemedText style={styles.error}>{error}</ThemedText>
          <Pressable onPress={() => router.replace("/")}>
            <ThemedText style={styles.retry}>Back to sign in</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" />
          <ThemedText>Finishing sign in…</ThemedText>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  error: { color: "#dc2626", textAlign: "center" },
  retry: { color: "#2563eb", fontWeight: "600" },
});
