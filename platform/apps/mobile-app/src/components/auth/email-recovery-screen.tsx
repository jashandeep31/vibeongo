import type { EmailOtpChallenge } from "@repo/api-client";
import {
  useForgotPassword,
  useResendVerification,
  useResetPassword,
  useVerifyEmail,
} from "@repo/api-hooks";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  AppState,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { clearAccessToken } from "@/lib/auth";

export function EmailRecoveryScreen({
  purpose,
  initialEmail = "",
  initialChallenge,
  onBack,
  onComplete,
}: {
  purpose: "verification" | "reset";
  initialEmail?: string;
  initialChallenge?: EmailOtpChallenge;
  onBack: () => void;
  onComplete: () => void;
}) {
  const theme = useTheme();
  const verification = purpose === "verification";
  const forgot = useForgotPassword();
  const resendVerification = useResendVerification();
  const verify = useVerifyEmail();
  const reset = useResetPassword();
  const [email, setEmail] = useState(initialEmail);
  const [challenge, setChallenge] = useState(initialChallenge ?? null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [resendAt, setResendAt] = useState(
    () => Date.now() + (initialChallenge?.resendAfterSeconds ?? 0) * 1000,
  );
  const [expiresAt, setExpiresAt] = useState(
    () => Date.now() + (initialChallenge?.expiresInSeconds ?? 0) * 1000,
  );
  const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = !!challenge && now >= expiresAt;
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!inFlight.current) {
          if (complete) onComplete();
          else onBack();
        }
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack, onComplete, complete]);
  useEffect(() => {
    if (!challenge || complete) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [challenge, complete]);
  useEffect(() => {
    if (error) AccessibilityInfo.announceForAccessibility(error);
  }, [error]);
  function selectChallenge(next: EmailOtpChallenge) {
    const receivedAt = Date.now();
    setChallenge(next);
    setNow(receivedAt);
    setOtp("");
    setResendAt(receivedAt + next.resendAfterSeconds * 1000);
    setExpiresAt(receivedAt + next.expiresInSeconds * 1000);
  }
  function handleError(failure: unknown, sending: boolean) {
    const response = (
      failure as {
        response?: { status?: number; headers?: Record<string, unknown> };
      } | null
    )?.response;
    if (response) {
      if (response.status === 429) {
        const seconds = Number(response.headers?.["retry-after"]);
        if (Number.isFinite(seconds) && seconds > 0)
          setResendAt(Date.now() + seconds * 1000);
        setError("Too many attempts. Please wait and try again.");
      } else if (response.status === 400)
        setError(
          sending
            ? "Enter a valid email address."
            : "The code is incorrect, expired, or no longer available. Try again or request a new code.",
        );
      else
        setError(
          sending
            ? "Could not send the code. Please try again shortly."
            : "Could not complete this request. Please try again shortly.",
        );
    } else
      setError(
        "Could not reach the server. Check your connection and try again.",
      );
  }
  async function sendCode() {
    if (inFlight.current || wait > 0) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    Keyboard.dismiss();
    try {
      const next =
        verification && challenge
          ? await resendVerification.mutateAsync({
              email: email.trim(),
              challengeId: challenge.challengeId,
            })
          : await forgot.mutateAsync({ email: email.trim() });
      selectChallenge(next);
      setNotice(
        verification
          ? "A new code has been sent."
          : "If your account has a verified email and password, a reset code has been sent.",
      );
    } catch (failure) {
      handleError(failure, true);
    } finally {
      forgot.reset();
      resendVerification.reset();
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function submit() {
    if (inFlight.current || !challenge) return;
    setError(null);
    setNotice(null);
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit code from your email.");
      return;
    }
    if (Date.now() >= expiresAt) {
      setNow(Date.now());
      setError("This code has expired. Request a new code.");
      return;
    }
    if (!verification) {
      const length = Array.from(password).length;
      if (length < 8 || length > 20 || /\s/u.test(password)) {
        setError("Enter a password of 8–20 characters without spaces.");
        return;
      }
      if (password !== confirmation) {
        setError("Your passwords do not match.");
        return;
      }
    }
    inFlight.current = true;
    setBusy(true);
    Keyboard.dismiss();
    try {
      const payload = {
        email: email.trim(),
        challengeId: challenge.challengeId,
        otp,
      };
      if (verification) await verify.mutateAsync(payload);
      else {
        await reset.mutateAsync({ ...payload, newPassword: password });
        await clearAccessToken();
      }
      setOtp("");
      setPassword("");
      setConfirmation("");
      setComplete(true);
      AccessibilityInfo.announceForAccessibility(
        verification
          ? "Email verified. Please sign in."
          : "Password updated. Please sign in.",
      );
    } catch (failure) {
      handleError(failure, false);
    } finally {
      verify.reset();
      reset.reset();
      inFlight.current = false;
      setBusy(false);
    }
  }
  const inputStyle = [
    styles.input,
    {
      color: theme.text,
      backgroundColor: theme.backgroundElement,
      borderColor: theme.backgroundSelected,
    },
  ];
  function action(
    label: string,
    operation: () => void,
    primary = false,
    disabled = busy,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        onPress={operation}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: primary ? theme.text : theme.background,
            borderColor: theme.backgroundSelected,
          },
          (pressed || disabled) && styles.dim,
        ]}
      >
        {primary && busy ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <ThemedText
            style={[
              styles.buttonText,
              { color: primary ? theme.background : theme.text },
            ]}
          >
            {label}
          </ThemedText>
        )}
      </Pressable>
    );
  }
  function secretField(
    label: string,
    value: string,
    change: (value: string) => void,
    confirm = false,
  ) {
    return (
      <View style={styles.field}>
        <ThemedText style={styles.label}>{label}</ThemedText>
        <View style={styles.inputRow}>
          <TextInput
            accessibilityLabel={label}
            value={value}
            onChangeText={change}
            editable={!busy}
            style={[inputStyle, !confirm && styles.secret]}
            secureTextEntry={!visible}
            autoComplete="new-password"
            textContentType="newPassword"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={40}
            returnKeyType={confirm ? "go" : "next"}
            onSubmitEditing={confirm ? () => void submit() : undefined}
          />
          {!confirm ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? "Hide password" : "Show password"}
              disabled={busy}
              onPress={() => setVisible((value) => !value)}
              style={styles.visibility}
            >
              <ThemedText style={styles.label}>
                {visible ? "Hide" : "Show"}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }
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
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.content}>
            <View style={styles.heading}>
              <ThemedText accessibilityRole="header" style={styles.title}>
                {complete
                  ? verification
                    ? "Email verified"
                    : "Password updated"
                  : challenge
                    ? verification
                      ? "Verify your email"
                      : "Reset your password"
                    : "Forgot your password?"}
              </ThemedText>
              <ThemedText themeColor="textSecondary">
                {complete
                  ? "Sign in to continue."
                  : challenge
                    ? verification
                      ? `Enter the code sent to ${email}.`
                      : `If ${email} has a verified password account, we’ve sent a reset code.`
                    : "Enter your email to request a reset code."}
              </ThemedText>
            </View>
            {complete ? (
              action("Continue to sign in", onComplete, true)
            ) : (
              <>
                {!challenge ? (
                  <View style={styles.field}>
                    <ThemedText style={styles.label}>Email</ThemedText>
                    <TextInput
                      accessibilityLabel="Email"
                      value={email}
                      onChangeText={setEmail}
                      editable={!busy}
                      style={inputStyle}
                      placeholder="you@example.com"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      maxLength={255}
                      returnKeyType="go"
                      onSubmitEditing={() => void sendCode()}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.field}>
                      <ThemedText style={styles.label}>
                        Verification code
                      </ThemedText>
                      <TextInput
                        accessibilityLabel="Verification code"
                        value={otp}
                        onChangeText={(value) =>
                          setOtp(value.replace(/\D/g, "").slice(0, 6))
                        }
                        editable={!busy}
                        style={[inputStyle, styles.otp]}
                        keyboardType="number-pad"
                        autoComplete="one-time-code"
                        textContentType="oneTimeCode"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={6}
                        returnKeyType={verification ? "go" : "next"}
                        onSubmitEditing={
                          verification ? () => void submit() : undefined
                        }
                      />
                      <ThemedText
                        themeColor="textSecondary"
                        style={styles.hint}
                      >
                        {expired
                          ? "This code has expired. Request a new one."
                          : "Codes expire after 10 minutes. Check your spam folder too."}
                      </ThemedText>
                    </View>
                    {!verification ? (
                      <>
                        {secretField("New password", password, setPassword)}
                        {secretField(
                          "Confirm password",
                          confirmation,
                          setConfirmation,
                          true,
                        )}
                      </>
                    ) : null}
                  </>
                )}
                {error ? (
                  <ThemedText
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={styles.error}
                  >
                    {error}
                  </ThemedText>
                ) : null}
                {notice ? (
                  <ThemedText
                    accessibilityLiveRegion="polite"
                    themeColor="textSecondary"
                    style={styles.hint}
                  >
                    {notice}
                  </ThemedText>
                ) : null}
                {challenge ? (
                  <>
                    {action(
                      verification ? "Verify email" : "Update password",
                      () => void submit(),
                      true,
                      busy || expired,
                    )}
                    {action(
                      wait > 0 ? `Resend code in ${wait}s` : "Resend code",
                      () => void sendCode(),
                      false,
                      busy || wait > 0,
                    )}
                  </>
                ) : (
                  action(
                    wait > 0 ? `Try again in ${wait}s` : "Send reset code",
                    () => void sendCode(),
                    true,
                    busy || wait > 0,
                  )
                )}
                {action(
                  verification
                    ? "Change signup details"
                    : challenge
                      ? "Use another email"
                      : "Back to sign in",
                  () => {
                    if (!verification && challenge) {
                      setChallenge(null);
                      setOtp("");
                      setPassword("");
                      setConfirmation("");
                      setError(null);
                      setNotice(null);
                      setResendAt(0);
                    } else onBack();
                  },
                )}
                {!verification && challenge
                  ? action("Back to sign in", onBack)
                  : null}
              </>
            )}
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
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: { width: "100%", maxWidth: 420, gap: 16 },
  heading: { gap: 8, marginBottom: 8 },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  hint: { fontSize: 13, lineHeight: 20 },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputRow: { position: "relative" },
  secret: { paddingRight: 64 },
  visibility: {
    position: "absolute",
    right: 4,
    top: 4,
    bottom: 4,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  otp: { textAlign: "center", fontSize: 22, letterSpacing: 8 },
  error: { color: "#ef4444", fontSize: 14, lineHeight: 20 },
  button: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontWeight: "700" },
  dim: { opacity: 0.7 },
});
