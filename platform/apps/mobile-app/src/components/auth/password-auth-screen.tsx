import type { EmailOtpChallenge } from "@repo/api-client";
import { EmailRecoveryScreen } from "./email-recovery-screen";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useMobileSigninWithPassword,
  useMobileSignupWithPassword,
  useQueryClient,
} from "@repo/api-hooks";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { saveAccessToken } from "@/lib/auth";
import { GithubSignInButton } from "./github-sign-in-button";
import { AuthHeading } from "./auth-heading";

export function PasswordAuthScreen({
  mode,
  onChangeMode,
}: {
  mode: "signin" | "signup";
  onChangeMode: (mode: "signin" | "signup" | "forgot") => void;
}) {
  const theme = useTheme();
  const signup = mode === "signup";
  const signinMutation = useMobileSigninWithPassword();
  const signupMutation = useMobileSignupWithPassword();
  const queryClient = useQueryClient();
  const [challenge, setChallenge] = useState<EmailOtpChallenge | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);
    setUnverified(false);
    if (signup && (!name.trim() || name.trim().length > 100)) {
      setError("Enter your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }
    if (
      Array.from(password).length < 8 ||
      Array.from(password).length > 20 ||
      /\s/u.test(password)
    ) {
      setError("Enter a password of 8–20 characters without spaces.");
      return;
    }
    if (signup && password !== confirmation) {
      setError("Your passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const verification = await signupMutation.mutateAsync({
          email: email.trim(),
          password,
          firstName: name.trim(),
        });
        setPassword("");
        setConfirmation("");
        setChallenge(verification);
        return;
      }
      const result = await signinMutation.mutateAsync({
        email: email.trim(),
        password,
      });
      // Persist only the token. Account data is cached; passwords are never stored.
      await queryClient.cancelQueries();
      await saveAccessToken(result.token);
      queryClient.setQueryData(["current-user"], result.data);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      const failure = cause as {
        response?: {
          status?: number;
          data?: { message?: string; code?: string };
        };
      };
      const status = failure.response?.status;
      if (failure.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setUnverified(true);
        setError(
          "Verify your email before signing in. Finish signup to request a code.",
        );
        return;
      }
      setError(
        status === 401
          ? "Incorrect email or password."
          : status === 409
            ? "An account already uses this email. Try signing in."
            : status === 429
              ? "Too many attempts. Please try again later."
              : status === 400
                ? "Check your email and password and try again."
                : "Could not sign in. Check your connection and try again.",
      );
    } finally {
      signinMutation.reset();
      signupMutation.reset();
      setBusy(false);
    }
  };

  if (challenge)
    return (
      <EmailRecoveryScreen
        purpose="verification"
        initialEmail={email.trim()}
        initialChallenge={challenge}
        onBack={() => {
          setChallenge(null);
          setError(null);
        }}
        onComplete={() => onChangeMode("signin")}
      />
    );

  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.background,
      borderColor: theme.backgroundSelected,
    },
  ];
  const field = (
    label: string,
    value: string,
    change: (text: string) => void,
    secret = false,
    confirm = false,
  ) => (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={change}
          editable={!busy}
          style={[inputStyle, secret && { paddingRight: 64 }]}
          placeholder={
            secret ? label : label === "Email" ? "you@example.com" : "Your name"
          }
          placeholderTextColor={theme.textSecondary}
          autoCapitalize={label === "Name" ? "words" : "none"}
          autoCorrect={false}
          keyboardType={label === "Email" ? "email-address" : "default"}
          autoComplete={
            label === "Email"
              ? "email"
              : secret
                ? signup
                  ? "new-password"
                  : "current-password"
                : "name"
          }
          textContentType={
            label === "Email"
              ? "emailAddress"
              : secret
                ? signup
                  ? "newPassword"
                  : "password"
                : "givenName"
          }
          secureTextEntry={secret && !visible}
          maxLength={secret ? 512 : label === "Email" ? 255 : 100}
          returnKeyType={secret && (!signup || confirm) ? "go" : "next"}
          onSubmitEditing={
            secret && (!signup || confirm) ? () => void submit() : undefined
          }
        />
        {secret && !confirm ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? "Hide password" : "Show password"}
            onPress={() => setVisible(!visible)}
            style={styles.visibility}
            disabled={busy}
          >
            <ThemedText style={styles.label}>
              {visible ? "Hide" : "Show"}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            <AuthHeading title={signup ? "Sign up" : "Welcome back"} />
            {signup ? field("Name", name, setName) : null}
            {field("Email", email, setEmail)}
            {field("Password", password, setPassword, true)}
            {signup
              ? field(
                  "Confirm password",
                  confirmation,
                  setConfirmation,
                  true,
                  true,
                )
              : null}
            {!signup ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onChangeMode("forgot")}
                disabled={busy}
                style={styles.forgotLink}
              >
                <ThemedText style={styles.linkText}>Forgot password?</ThemedText>
              </Pressable>
            ) : null}
            {unverified ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onChangeMode("signup")}
                disabled={busy}
                style={styles.forgotLink}
              >
                <ThemedText>Finish signup and verify email</ThemedText>
              </Pressable>
            ) : null}
            {error ? (
              <ThemedText
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                style={styles.error}
              >
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              disabled={busy}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: theme.text,
                },
                (pressed || busy) && { opacity: 0.7 },
              ]}
            >
              {busy ? (
                <ActivityIndicator color={theme.background} />
              ) : (
                <ThemedText
                  style={[styles.buttonText, { color: theme.background }]}
                >
                  {signup ? "Create account" : "Sign in"}
                </ThemedText>
              )}
            </Pressable>
            <View style={styles.divider}>
              <View
                style={[styles.line, { backgroundColor: theme.backgroundSelected }]}
              />
              <ThemedText themeColor="textSecondary" style={styles.hint}>
                or
              </ThemedText>
              <View
                style={[styles.line, { backgroundColor: theme.backgroundSelected }]}
              />
            </View>
            <GithubSignInButton disabled={busy} />
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => onChangeMode(signup ? "signin" : "signup")}
              style={styles.accountSwitch}
            >
              <ThemedText themeColor="textSecondary">
                {signup ? "Already have an account? " : "New to VibeOnGo? "}
                <ThemedText style={styles.linkText}>
                  {signup ? "Sign in" : "Sign up"}
                </ThemedText>
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
  },
  content: { width: "100%", maxWidth: 420 },
  field: { gap: 6, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: "600", lineHeight: 20 },
  inputRow: { position: "relative" },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 16,
  },
  visibility: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { fontSize: 14, lineHeight: 20 },
  error: { color: "#d13f3f", fontSize: 14, lineHeight: 20, marginBottom: 16 },
  button: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonText: { fontSize: 16, fontWeight: "600" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 10,
  },
  line: { flex: 1, height: 1 },
  forgotLink: {
    minHeight: 44,
    alignSelf: "flex-end",
    justifyContent: "center",
  },
  accountSwitch: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  linkText: { fontWeight: "700" },
});
