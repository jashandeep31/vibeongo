import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { useCompleteMobileGithubConnection } from "@repo/api-hooks";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GITHUB_CONNECT_PKCE_KEY } from "@/components/auth/github-connection-settings";

// Deduplicate the OS deep link and AuthSession result if both open the callback.
const completions = new Map<string, Promise<void>>();

export default function GithubConnectedScreen() {
  const params = useLocalSearchParams<{
    ticket?: string;
    state?: string;
    github?: string;
    message?: string;
  }>();
  const router = useRouter();
  const complete = useCompleteMobileGithubConnection();
  const run = useRef(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (run.current) return;
    if (params.github === "error" || !params.ticket || !params.state) {
      setError(params.message || "GitHub connection was not completed.");
      return;
    }
    run.current = true;
    setError(null);
    const key = `${params.ticket}:${params.state}`;
    let operation = completions.get(key);
    if (!operation) {
      operation = (async () => {
        const stored = await SecureStore.getItemAsync(GITHUB_CONNECT_PKCE_KEY);
        if (!stored)
          throw new Error("GitHub connection expired. Please try again.");
        const pkce = JSON.parse(stored) as {
          state: string;
          codeVerifier: string;
        };
        if (pkce.state !== params.state)
          throw new Error(
            "This callback does not match your connection request.",
          );
        try {
          await complete.mutateAsync({
            ticket: params.ticket!,
            state: params.state!,
            codeVerifier: pkce.codeVerifier,
          });
        } finally {
          await SecureStore.deleteItemAsync(GITHUB_CONNECT_PKCE_KEY);
          complete.reset();
        }
      })();
      completions.set(key, operation);
      setTimeout(() => completions.delete(key), 60_000);
    }
    void operation
      .then(() => router.replace("/settings"))
      .catch((cause: unknown) => {
        const failure = cause as {
          response?: { data?: { message?: unknown } };
        } | null;
        setError(
          typeof failure?.response?.data?.message === "string"
            ? failure.response.data.message
            : "Could not connect GitHub. Return to settings and try again.",
        );
      });
  }, [
    params.ticket,
    params.state,
    params.github,
    params.message,
    complete,
    router,
  ]);
  return (
    <ThemedView style={styles.screen}>
      {error ? (
        <>
          <ThemedText accessibilityRole="alert">{error}</ThemedText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/settings")}
            style={styles.button}
          >
            <ThemedText>Back to settings</ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator />
          <ThemedText>Connecting GitHub…</ThemedText>
        </>
      )}
    </ThemedView>
  );
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  button: { minHeight: 48, justifyContent: "center" },
});
