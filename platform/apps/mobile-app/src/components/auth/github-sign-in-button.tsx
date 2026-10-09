import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { BACKEND_URL } from "@/constants/config";

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "vibeongo",
  path: "auth/callback",
});
const MOBILE_PKCE_KEY = "vibeongo.mobilePkce";

WebBrowser.maybeCompleteAuthSession();

export function GithubSignInButton({
  disabled = false,
}: {
  disabled?: boolean;
}) {
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
      usePKCE: true,
      extraParams: { platform: "mobile" },
    },
    discovery,
  );

  const signIn = async () => {
    setError(null);
    if (!request?.state || !request.codeVerifier) {
      setError("Could not prepare secure sign-in. Please try again.");
      return;
    }
    try {
      await SecureStore.setItemAsync(
        MOBILE_PKCE_KEY,
        JSON.stringify({
          state: request.state,
          codeVerifier: request.codeVerifier,
        }),
      );
      await promptAsync();
    } catch {
      setError("Could not open GitHub sign-in. Please try again.");
    }
  };

  return (
    <View style={{ gap: 8, width: "100%" }}>
      {error ? (
        <ThemedText accessibilityRole="alert" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with GitHub, recommended"
        disabled={!request || disabled}
        onPress={() => void signIn()}
        style={({ pressed }) => [
          styles.githubButton,
          (!request || disabled) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.githubButtonText}>
          Continue with GitHub
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeText}>Recommended</ThemedText>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#ffffff24",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
  },
  disabled: { opacity: 0.5 },
  error: { color: "#ef4444", textAlign: "center" },
  githubButton: {
    alignItems: "center",
    backgroundColor: "#24292f",
    borderRadius: 12,
    justifyContent: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 12,
    minHeight: 50,
    paddingHorizontal: 16,
    width: "100%",
  },
  githubButtonText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.72 },
});
