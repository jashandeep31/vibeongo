import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function ProjectFileCreateDrawer({
  currentPath,
  isCreating,
  onClose,
  onCreate,
  visible,
}: {
  currentPath: string;
  isCreating: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!visible) setName("");
  }, [visible]);

  const submit = () => {
    if (!name.trim() || isCreating) return;
    onCreate(name);
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close create file drawer"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          visible={visible}
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <ThemedText style={styles.title}>Create file or folder</ThemedText>
          <ThemedText style={styles.description} themeColor="textSecondary">
            Add it inside {currentPath}. End the name with / to create a folder.
          </ThemedText>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            editable={!isCreating}
            onChangeText={setName}
            onSubmitEditing={submit}
            placeholder="src/index.ts or src/components/"
            placeholderTextColor={theme.textSecondary}
            returnKeyType="done"
            style={[
              styles.input,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
            value={name}
          />
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isCreating}
              onPress={onClose}
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
              accessibilityState={{ disabled: !name.trim() || isCreating }}
              disabled={!name.trim() || isCreating}
              onPress={submit}
              style={({ pressed }) => [
                styles.action,
                { backgroundColor: theme.text },
                (!name.trim() || isCreating) && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              {isCreating ? (
                <ActivityIndicator color={theme.background} size="small" />
              ) : (
                <ThemedText
                  style={[styles.actionLabel, { color: theme.background }]}
                >
                  Create
                </ThemedText>
              )}
            </Pressable>
          </View>
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  actionLabel: { fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  description: { fontSize: 13, lineHeight: 19, marginTop: 6 },
  disabled: { opacity: 0.45 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  input: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: Fonts.mono,
    fontSize: 14,
    marginTop: 16,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  pressed: { opacity: 0.72 },
  root: { flex: 1, justifyContent: "flex-end" },
  title: { fontSize: 18, fontWeight: "700" },
});
