import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/hooks/use-theme";

export function LoginScreen() {
  const colors = useTheme();
  const { error, isSigningIn, signIn } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.brand }]}>
            <ThemedText style={styles.brandMarkText}>V</ThemedText>
          </View>
          <ThemedText style={styles.brandName}>vibeongo</ThemedText>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.eyebrow,
              { backgroundColor: colors.backgroundElement },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={[styles.eyebrowText, { color: colors.brand }]}
            >
              BUILD FROM ANYWHERE
            </ThemedText>
          </View>

          <ThemedText type="title" style={styles.title}>
            Your projects, now in your pocket.
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Sign in with GitHub to access your VibeOngo workspace and keep
            shipping on the move.
          </ThemedText>

          <Pressable
            accessibilityRole="button"
            disabled={isSigningIn}
            onPress={signIn}
            style={({ pressed }) => [
              styles.githubButton,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
              isSigningIn && styles.buttonDisabled,
            ]}
          >
            {isSigningIn ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <>
                <ThemedText
                  style={[
                    styles.githubIcon,
                    { color: colors.primaryForeground },
                  ]}
                >
                  GH
                </ThemedText>
                <ThemedText
                  style={[
                    styles.githubButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Continue with GitHub
                </ThemedText>
              </>
            )}
          </Pressable>

          {error ? (
            <ThemedText
              accessibilityRole="alert"
              style={[styles.error, { color: colors.destructive }]}
            >
              {error}
            </ThemedText>
          ) : null}
        </View>

        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.terms}
        >
          By continuing, you agree to VibeOngo&apos;s Terms and Privacy Policy.
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: Spacing.four },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: Spacing.three,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-7deg" }],
  },
  brandMarkText: { color: "#ffffff", fontSize: 18, fontWeight: "900" },
  brandName: { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 560,
    alignSelf: "center",
    width: "100%",
  },
  eyebrow: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  eyebrowText: { fontSize: 11, letterSpacing: 1.2 },
  title: {
    fontSize: 45,
    lineHeight: 49,
    letterSpacing: -1.8,
    marginTop: Spacing.three,
  },
  description: {
    fontSize: 17,
    lineHeight: 26,
    marginTop: Spacing.three,
    maxWidth: 500,
  },
  githubButton: {
    minHeight: 56,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: Spacing.five,
  },
  githubIcon: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  githubButtonText: { fontSize: 16, fontWeight: "700" },
  buttonPressed: { transform: [{ scale: 0.985 }], opacity: 0.9 },
  buttonDisabled: { opacity: 0.7 },
  error: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 14,
  },
  terms: { textAlign: "center", paddingBottom: Spacing.four, lineHeight: 20 },
});
