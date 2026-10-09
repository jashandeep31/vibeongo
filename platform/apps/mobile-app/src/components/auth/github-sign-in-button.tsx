import * as AuthSession from "expo-auth-session";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { BACKEND_URL } from "@/constants/config";
import { useTheme } from "@/hooks/use-theme";

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
  const theme = useTheme();
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
        accessibilityLabel="Continue with GitHub"
        disabled={!request || disabled}
        onPress={() => void signIn()}
        style={({ pressed }) => [
          styles.githubButton,
          { backgroundColor: theme.background, borderColor: theme.backgroundSelected },
          (!request || disabled) && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <Image
          source={require("../../../assets/images/github.svg")}
          style={styles.githubIcon}
          tintColor={theme.text}
          contentFit="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <ThemedText style={styles.githubButtonText}>
          Continue with GitHub
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  error: { color: "#d13f3f", textAlign: "center" },
  githubButton: {
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 24,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%",
  },
  githubIcon: { width: 20, height: 20 },
  githubButtonText: { fontSize: 16, fontWeight: "600" },
  pressed: { opacity: 0.72 },
});
