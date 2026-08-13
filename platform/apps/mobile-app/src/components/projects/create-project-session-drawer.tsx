import type { Project } from "@repo/api-client";
import { useCreateProjectSession } from "@repo/api-hooks";
import { useState } from "react";
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
import { useTheme } from "@/hooks/use-theme";

function getErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return "Could not create the session.";
}

export function CreateProjectSessionDrawer({
  onClose,
  project,
}: {
  onClose: () => void;
  project: Project | null;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const createSession = useCreateProjectSession();
  const [sessionName, setSessionName] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const trimmedName = sessionName.trim();
  const isNameTooShort = sessionName.length > 0 && trimmedName.length < 4;

  const finishClose = () => {
    setSessionName("");
    setSessionDescription("");
    setErrorMessage(null);
    onClose();
  };

  const close = () => {
    if (!createSession.isPending) finishClose();
  };

  const submit = async () => {
    if (!project || trimmedName.length < 4 || createSession.isPending) return;
    setErrorMessage(null);
    try {
      await createSession.mutateAsync({
        projectId: project.id,
        sessionName: trimmedName,
        sessionDescription: sessionDescription.trim() || undefined,
      });
      finishClose();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={Boolean(project)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close new session drawer"
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
          visible={Boolean(project)}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ScrollView keyboardShouldPersistTaps="handled">
            <ThemedText style={styles.title}>New project session</ThemedText>
            <ThemedText style={styles.projectName} themeColor="textSecondary">
              {project?.name}
            </ThemedText>
            <View style={styles.fields}>
              <View style={styles.field}>
                <ThemedText style={styles.label} themeColor="textSecondary">
                  Session name
                </ThemedText>
                <TextInput
                  autoFocus
                  editable={!createSession.isPending}
                  onChangeText={setSessionName}
                  placeholder="e.g. Implement command palette"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={sessionName}
                />
                {isNameTooShort ? (
                  <ThemedText style={styles.validation}>
                    Session name must be at least 4 characters.
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.field}>
                <ThemedText style={styles.label} themeColor="textSecondary">
                  Description (optional)
                </ThemedText>
                <TextInput
                  editable={!createSession.isPending}
                  multiline
                  onChangeText={setSessionDescription}
                  placeholder="What will this session be used for?"
                  placeholderTextColor={theme.textSecondary}
                  style={[
                    styles.input,
                    styles.descriptionInput,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  textAlignVertical="top"
                  value={sessionDescription}
                />
              </View>
            </View>
            {errorMessage ? (
              <ThemedText style={styles.error}>{errorMessage}</ThemedText>
            ) : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                disabled={createSession.isPending}
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
                accessibilityState={{
                  disabled: trimmedName.length < 4 || createSession.isPending,
                }}
                disabled={trimmedName.length < 4 || createSession.isPending}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.action,
                  { backgroundColor: theme.text },
                  (trimmedName.length < 4 || createSession.isPending) &&
                    styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                {createSession.isPending ? (
                  <ActivityIndicator color={theme.background} size="small" />
                ) : (
                  <ThemedText
                    style={[styles.actionLabel, { color: theme.background }]}
                  >
                    Create session
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
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "90%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 18,
    width: 38,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.4 },
  projectName: { fontSize: 13, marginTop: 3 },
  fields: { gap: 16, marginTop: 22 },
  field: { gap: 6 },
  label: { fontSize: 12, lineHeight: 16 },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 49,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  descriptionInput: { height: 104 },
  validation: { color: "#ef4444", fontSize: 12, lineHeight: 17 },
  error: { color: "#ef4444", fontSize: 13, lineHeight: 19, marginTop: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  action: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
  },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.7 },
});
