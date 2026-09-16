import type { OpencodeMcpConfig } from "@repo/api-client";
import { useAddOpencodeMcpServer } from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import type { OpencodeWorkspaceConnection } from "@/components/projects/project-mcp-drawer";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function AddProjectMcpDrawer({
  connection,
  onClose,
  visible,
}: {
  connection: OpencodeWorkspaceConnection;
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const add = useAddOpencodeMcpServer(connection);
  const [type, setType] = useState<"local" | "remote">("local");
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [argumentsText, setArgumentsText] = useState("");
  const [url, setUrl] = useState("");
  const [values, setValues] = useState("");
  const [oauthDisabled, setOauthDisabled] = useState(false);

  useEffect(() => {
    if (visible) return;
    setType("local");
    setName("");
    setCommand("");
    setArgumentsText("");
    setUrl("");
    setValues("");
    setOauthDisabled(false);
  }, [visible]);

  const submit = () => {
    if (add.isPending) return;
    const serverName = name.trim();
    if (!serverName) {
      Alert.alert("Server name required", "Enter a unique MCP server name.");
      return;
    }

    let entries: Record<string, string>;
    try {
      entries = parseEntries(values);
    } catch (error) {
      Alert.alert(
        "Invalid configuration",
        error instanceof Error ? error.message : "Check the key/value entries.",
      );
      return;
    }

    let config: OpencodeMcpConfig;
    if (type === "local") {
      const executable = command.trim();
      if (!executable) {
        Alert.alert(
          "Command required",
          "Enter the executable to run remotely.",
        );
        return;
      }
      config = {
        type: "local",
        command: [
          executable,
          ...argumentsText
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        ],
        ...(Object.keys(entries).length ? { environment: entries } : {}),
      };
    } else {
      const remoteUrl = url.trim();
      try {
        const parsed = new URL(remoteUrl);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error();
        }
      } catch {
        Alert.alert(
          "Invalid URL",
          "Enter a valid HTTP or HTTPS MCP server URL.",
        );
        return;
      }
      config = {
        type: "remote",
        url: remoteUrl,
        ...(Object.keys(entries).length ? { headers: entries } : {}),
        ...(oauthDisabled ? { oauth: false as const } : {}),
      };
    }

    add.mutate(
      { name: serverName, config },
      {
        onError: (error) =>
          Alert.alert("Could not add MCP server", error.message),
        onSuccess: onClose,
      },
    );
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.root}
      >
        <Pressable
          accessibilityLabel="Close add MCP server"
          onPress={onClose}
          style={styles.backdrop}
        />
        <BottomDrawerPanel
          accessibilityViewIsModal
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              borderColor: theme.backgroundSelected,
              paddingBottom: Math.max(insets.bottom, 18),
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
          <View style={styles.header}>
            <View style={styles.heading}>
              <ThemedText style={styles.title}>Add MCP server</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                The server runs in this remote workspace.
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Close"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.close}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={19}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label="Server name"
              onChangeText={setName}
              placeholder="github"
              value={name}
            />
            <View
              style={[
                styles.tabs,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              {(["local", "remote"] as const).map((value) => (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityState={{ selected: type === value }}
                  key={value}
                  onPress={() => setType(value)}
                  style={[
                    styles.tab,
                    type === value && {
                      backgroundColor: theme.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText style={styles.tabText}>
                    {value === "local" ? "Local command" : "Remote URL"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {type === "local" ? (
              <>
                <Field
                  label="Command"
                  onChangeText={setCommand}
                  placeholder="npx"
                  value={command}
                />
                <Field
                  label="Arguments (one per line)"
                  multiline
                  onChangeText={setArgumentsText}
                  placeholder={"-y\n@modelcontextprotocol/server-everything"}
                  value={argumentsText}
                />
                <Field
                  label="Environment variables (optional)"
                  multiline
                  onChangeText={setValues}
                  placeholder="API_KEY=value"
                  secureTextEntry
                  value={values}
                />
              </>
            ) : (
              <>
                <Field
                  label="Server URL"
                  onChangeText={setUrl}
                  placeholder="https://example.com/mcp"
                  value={url}
                />
                <Field
                  label="Request headers (optional)"
                  multiline
                  onChangeText={setValues}
                  placeholder="Authorization=Bearer token"
                  secureTextEntry
                  value={values}
                />
                <View
                  style={[
                    styles.switchRow,
                    { borderColor: theme.backgroundSelected },
                  ]}
                >
                  <View style={styles.switchCopy}>
                    <ThemedText style={styles.switchTitle}>
                      API key authentication
                    </ThemedText>
                    <ThemedText
                      style={styles.subtitle}
                      themeColor="textSecondary"
                    >
                      Disable automatic OAuth discovery.
                    </ThemedText>
                  </View>
                  <Switch
                    onValueChange={setOauthDisabled}
                    value={oauthDisabled}
                  />
                </View>
              </>
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            disabled={add.isPending}
            onPress={submit}
            style={({ pressed }) => [
              styles.submit,
              { backgroundColor: theme.text },
              pressed && styles.pressed,
              add.isPending && styles.disabled,
            ]}
          >
            {add.isPending ? (
              <ActivityIndicator color={theme.background} />
            ) : null}
            <ThemedText
              style={[styles.submitText, { color: theme.background }]}
            >
              Add server
            </ThemedText>
          </Pressable>
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label,
  multiline = false,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <ThemedText style={styles.label}>{label}</ThemedText>
      <TextInput
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: theme.backgroundElement, color: theme.text },
        ]}
      />
    </View>
  );
}

function parseEntries(value: string) {
  return Object.fromEntries(
    value
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        if (separator <= 0 || !key)
          throw new Error(`Line ${index + 1} must use KEY=value.`);
        return [key, line.slice(separator + 1).trim()];
      }),
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.42)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  close: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  disabled: { opacity: 0.55 },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxHeight: "92%",
    maxWidth: 680,
    paddingHorizontal: 18,
    position: "absolute",
    width: "100%",
  },
  field: { gap: 7 },
  form: { gap: 18, paddingBottom: 20, paddingTop: 16 },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    marginTop: 8,
    width: 36,
  },
  header: { alignItems: "center", flexDirection: "row" },
  heading: { flex: 1, gap: 2 },
  input: {
    borderRadius: 12,
    fontFamily: Fonts.mono,
    fontSize: 13,
    minHeight: 46,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  label: { fontSize: 13, fontWeight: "600" },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  pressed: { opacity: 0.72 },
  root: { flex: 1, justifyContent: "flex-end" },
  submit: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
  },
  submitText: { fontSize: 15, fontWeight: "700" },
  subtitle: { fontSize: 12, lineHeight: 17 },
  switchCopy: { flex: 1, gap: 2 },
  switchRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  switchTitle: { fontSize: 14, fontWeight: "600" },
  tab: {
    alignItems: "center",
    borderRadius: 9,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
  },
  tabs: { borderRadius: 12, flexDirection: "row", gap: 4, padding: 4 },
  tabText: { fontSize: 13, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700" },
});
