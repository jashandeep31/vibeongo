import { useCreateForgejoRepo, useCreateGithubRepo } from "@repo/api-hooks";
import { createGithubRepoSchema } from "@repo/shared";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type RepositoryProvider = "github" | "forgejo";

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string") {
      return response.data.message;
    }
  }
  return fallback;
}

export function ConnectGithubRepoDrawer({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const createGithubRepo = useCreateGithubRepo();
  const createForgejoRepo = useCreateForgejoRepo();
  const urlInputRef = useRef<TextInput>(null);
  const repoNameInputRef = useRef<TextInput>(null);
  const [provider, setProvider] = useState<RepositoryProvider>("github");
  const [url, setUrl] = useState("");
  const [setupScript, setSetupScript] = useState("");
  const [repoName, setRepoName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isPending = createGithubRepo.isPending || createForgejoRepo.isPending;

  useEffect(() => {
    if (!visible) return;
    const focusTimer = setTimeout(
      () =>
        provider === "github"
          ? urlInputRef.current?.focus()
          : repoNameInputRef.current?.focus(),
      220,
    );
    return () => clearTimeout(focusTimer);
  }, [provider, visible]);

  const resetAndClose = () => {
    setProvider("github");
    setUrl("");
    setSetupScript("");
    setRepoName("");
    setError(null);
    onClose();
  };

  const close = () => {
    if (!isPending) resetAndClose();
  };

  const submit = async () => {
    if (isPending) return;

    setError(null);
    try {
      if (provider === "github") {
        const validation = createGithubRepoSchema.safeParse({
          url: url.trim(),
          setup_script: setupScript,
        });
        if (!validation.success) {
          setError(
            validation.error.issues[0]?.message ?? "Check the repository.",
          );
          return;
        }
        await createGithubRepo.mutateAsync(validation.data);
      } else {
        const reponame = repoName.trim();
        if (!reponame) {
          setError("Repository name is required.");
          return;
        }
        await createForgejoRepo.mutateAsync({ reponame });
      }
      resetAndClose();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          provider === "github"
            ? "Could not add this repository. Check that the GitHub App has access."
            : "Could not create this Forgejo repository. Try a different name.",
        ),
      );
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close connect repository drawer"
          accessibilityRole="button"
          onPress={close}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          visible={visible}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <ThemedText style={styles.title}>Add repository</ThemedText>
            <ThemedText style={styles.description} themeColor="textSecondary">
              Choose a provider to connect an existing GitHub repository or
              create a new private Forgejo repository.
            </ThemedText>

            <View
              accessibilityLabel="Repository provider"
              accessibilityRole="radiogroup"
              style={[
                styles.providerSelector,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.backgroundSelected,
                },
              ]}
            >
              {(["github", "forgejo"] as const).map((option) => {
                const selected = provider === option;
                const label = option === "github" ? "GitHub" : "Forgejo";
                return (
                  <Pressable
                    accessibilityLabel={label}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selected,
                      disabled: isPending,
                    }}
                    disabled={isPending}
                    key={option}
                    onPress={() => {
                      setProvider(option);
                      setError(null);
                    }}
                    style={({ pressed }) => [
                      styles.providerOption,
                      selected && { backgroundColor: theme.text },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.providerOptionLabel,
                        selected && { color: theme.background },
                      ]}
                      themeColor={selected ? "text" : "textSecondary"}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.fields}>
              {provider === "github" ? (
                <>
                  <View style={styles.field}>
                    <ThemedText style={styles.label} themeColor="textSecondary">
                      Repository URL
                    </ThemedText>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isPending}
                      keyboardType="url"
                      onChangeText={setUrl}
                      placeholder="https://github.com/owner/repository"
                      placeholderTextColor={theme.textSecondary}
                      ref={urlInputRef}
                      returnKeyType="next"
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={url}
                    />
                  </View>
                  <View style={styles.field}>
                    <ThemedText style={styles.label} themeColor="textSecondary">
                      Setup script (optional)
                    </ThemedText>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isPending}
                      multiline
                      onChangeText={setSetupScript}
                      placeholder="npm install"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.input,
                        styles.scriptInput,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      textAlignVertical="top"
                      value={setupScript}
                    />
                  </View>
                </>
              ) : (
                <View style={styles.field}>
                  <ThemedText style={styles.label} themeColor="textSecondary">
                    Repository name
                  </ThemedText>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isPending}
                    onChangeText={setRepoName}
                    placeholder="my-new-repository"
                    placeholderTextColor={theme.textSecondary}
                    ref={repoNameInputRef}
                    returnKeyType="done"
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                        color: theme.text,
                      },
                    ]}
                    value={repoName}
                  />
                </View>
              )}
            </View>

            {error ? (
              <ThemedText style={styles.error}>{error}</ThemedText>
            ) : null}

            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={isPending}
                onPress={close}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.actionLabel}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isPending }}
                disabled={isPending}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.text },
                  pressed && styles.pressed,
                ]}
              >
                {isPending ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <ThemedText
                    style={[styles.actionLabel, { color: theme.background }]}
                  >
                    {provider === "github"
                      ? "Add repository"
                      : "Create repository"}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "90%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  error: { color: "#ef4444", fontSize: 13, lineHeight: 19, marginTop: 12 },
  field: { gap: 6 },
  fields: { gap: 16, marginTop: 22 },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 38,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 49,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  label: { fontSize: 12, lineHeight: 16 },
  pressed: { opacity: 0.7 },
  providerOption: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  providerOptionLabel: { fontSize: 13, fontWeight: "700" },
  providerSelector: {
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    marginTop: 20,
    padding: 4,
  },
  root: { flex: 1, justifyContent: "flex-end" },
  scriptInput: { fontFamily: Fonts.mono, height: 104, fontSize: 12 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
});
