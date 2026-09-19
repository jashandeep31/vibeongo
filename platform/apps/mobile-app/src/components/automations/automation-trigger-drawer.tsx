import { useCreateProjectAutomationTrigger } from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ChoiceField } from "@/components/choice-field";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { getApiErrorMessage } from "./automation-utils";

type Created = { secret: string; webhook_url: string };

export function AutomationTriggerDrawer({
  automationId,
  onClose,
  visible,
}: {
  automationId: string;
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const createTrigger = useCreateProjectAutomationTrigger();
  const [name, setName] = useState("");
  const [provider, setProvider] = useState<"sentry" | "custom">("sentry");
  const [created, setCreated] = useState<Created | null>(null);

  useEffect(() => {
    if (!visible) return;
    setName("");
    setProvider("sentry");
    setCreated(null);
  }, [visible]);

  const close = () => {
    if (!createTrigger.isPending) onClose();
  };
  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Toast.show({ type: "success", text1: `${label} copied` });
  };
  const create = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 3 || trimmed.length > 20) {
      Toast.show({
        type: "error",
        text1: "Use 3–20 characters for the integration name.",
      });
      return;
    }
    try {
      const response = await createTrigger.mutateAsync({
        automationId,
        name: trimmed,
        provider,
      });
      setCreated(response.data);
      Toast.show({ type: "success", text1: "Integration created" });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Could not create integration",
        text2: getApiErrorMessage(error, "Try again."),
      });
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
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close integration drawer"
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
            <ThemedText style={styles.title}>
              {created ? "Integration created" : "Create integration"}
            </ThemedText>
            <ThemedText style={styles.description} themeColor="textSecondary">
              {created
                ? "Save this secret now. It will not be shown again."
                : "Create a webhook integration that can trigger this automation."}
            </ThemedText>
            {created ? (
              <View style={styles.body}>
                <CopyValue
                  label="Webhook URL"
                  onCopy={() => void copy(created.webhook_url, "Webhook URL")}
                  value={created.webhook_url}
                />
                <CopyValue
                  label="Webhook token"
                  onCopy={() => void copy(created.secret, "Webhook token")}
                  value={created.secret}
                />
                <View
                  style={[
                    styles.note,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText style={styles.noteText}>
                    Send a POST request to the webhook URL with this header. Do
                    not add a Bearer prefix:
                  </ThemedText>
                  <ThemedText selectable style={styles.code}>
                    Authorization: {created.secret}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.body}>
                <View style={styles.field}>
                  <ThemedText style={styles.label}>Integration name</ThemedText>
                  <TextInput
                    autoFocus
                    editable={!createTrigger.isPending}
                    maxLength={20}
                    onChangeText={setName}
                    placeholder="e.g. Sentry production"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.input,
                      {
                        color: theme.text,
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                    value={name}
                  />
                  <ThemedText style={styles.help} themeColor="textSecondary">
                    Use 3–20 characters.
                  </ThemedText>
                </View>
                <ChoiceField
                  disabled={createTrigger.isPending}
                  label="Provider"
                  onChange={(value) =>
                    setProvider(value as "sentry" | "custom")
                  }
                  options={[
                    { id: "sentry", label: "Sentry" },
                    { id: "custom", label: "Custom webhook" },
                  ]}
                  placeholder="Choose a provider"
                  value={provider}
                />
              </View>
            )}
            <View style={styles.actions}>
              {!created ? (
                <DrawerButton label="Cancel" onPress={close} />
              ) : null}
              <DrawerButton
                label={created ? "Done" : "Create integration"}
                loading={createTrigger.isPending}
                primary
                onPress={created ? close : () => void create()}
              />
            </View>
          </ScrollView>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function CopyValue({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => void;
  value: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <View style={styles.copyRow}>
        <ThemedText
          selectable
          numberOfLines={3}
          style={[
            styles.copyValue,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          {value}
        </ThemedText>
        <DrawerButton label="Copy" onPress={onCopy} />
      </View>
    </View>
  );
}

function DrawerButton({
  label,
  loading = false,
  onPress,
  primary = false,
}: {
  label: string;
  loading?: boolean;
  onPress: () => void;
  primary?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? theme.text : theme.backgroundElement },
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? theme.background : theme.text} />
      ) : (
        <ThemedText
          style={[styles.buttonText, primary && { color: theme.background }]}
        >
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  body: { gap: 17, marginTop: 22 },
  button: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 13,
  },
  buttonText: { fontSize: 14, fontWeight: "700" },
  code: { fontFamily: "monospace", fontSize: 11, marginTop: 8 },
  copyRow: { alignItems: "stretch", flexDirection: "row", gap: 8 },
  copyValue: {
    borderRadius: 10,
    flex: 1,
    fontFamily: "monospace",
    fontSize: 11,
    padding: 11,
  },
  description: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: "88%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  field: { gap: 7 },
  handle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 17,
    width: 38,
  },
  help: { fontSize: 12 },
  input: {
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  label: { fontSize: 13, fontWeight: "700" },
  note: { borderRadius: 11, padding: 12 },
  noteText: { fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.65 },
  root: { flex: 1, justifyContent: "flex-end" },
  title: { fontSize: 21, fontWeight: "700" },
});
