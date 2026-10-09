import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useGithubConnection, useStartGithubConnection } from "@repo/api-hooks";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { BACKEND_URL } from "@/constants/config";

export const GITHUB_CONNECT_PKCE_KEY = "vibeongo.githubConnectPkce";
const redirectUri = AuthSession.makeRedirectUri({
  scheme: "vibeongo",
  path: "auth/github-connected",
});

export function GithubConnectionSettings() {
  const router = useRouter();
  const theme = useTheme();
  const connection = useGithubConnection();
  const start = useStartGithubConnection();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const discovery = useMemo(
    () => ({ authorizationEndpoint: `${BACKEND_URL}/api/v1/auth/github` }),
    [],
  );
  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: "vibeongo-mobile",
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery,
  );
  const connect = async () => {
    if (busy || !request?.codeVerifier || !request.codeChallenge) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await start.mutateAsync({
        clientType: "mobile",
        state: request.state,
        codeChallenge: request.codeChallenge,
      });
      await SecureStore.setItemAsync(
        GITHUB_CONNECT_PKCE_KEY,
        JSON.stringify({
          state: request.state,
          codeVerifier: request.codeVerifier,
        }),
      );
      const result = await promptAsync({ url });
      if (result.type === "success") {
        router.replace({
          pathname: "/auth/github-connected",
          params: result.params,
        });
      }
      if (result.type === "error")
        setError("Could not connect GitHub. Please try again.");
      if (result.type === "cancel" || result.type === "dismiss")
        await SecureStore.deleteItemAsync(GITHUB_CONNECT_PKCE_KEY);
    } catch {
      setError("Could not start GitHub connection. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.section}>
      <ThemedText style={styles.title}>GitHub account</ThemedText>
      {connection.isPending ? (
        <ActivityIndicator />
      ) : connection.isError ? (
        <>
          <ThemedText accessibilityRole="alert">
            Could not check your GitHub connection.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => void connection.refetch()}
          >
            <ThemedText>Retry</ThemedText>
          </Pressable>
        </>
      ) : connection.data?.connected ? (
        <ThemedText themeColor="textSecondary" style={styles.description}>
          Connected
          {connection.data.username ? ` as @${connection.data.username}` : ""}.
          GitHub is your primary login.
        </ThemedText>
      ) : (
        <>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Connect GitHub to access your repositories. Your profile will use
            your GitHub details, and GitHub will replace email/password login.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            disabled={busy || !request}
            onPress={() => void connect()}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.text },
              (pressed || busy || !request) && { opacity: 0.6 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText
                style={{ color: theme.background, fontWeight: "600" }}
              >
                Connect GitHub
              </ThemedText>
            )}
          </Pressable>
        </>
      )}
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: 12, paddingVertical: 16 },
  title: { fontSize: 16, fontWeight: "600" },
  description: { fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  error: { color: "#ef4444", fontSize: 14 },
});
