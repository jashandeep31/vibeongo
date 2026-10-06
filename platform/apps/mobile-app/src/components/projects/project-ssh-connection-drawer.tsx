import { formatSshCommand, type CreateSshTicketResponse } from "@repo/api-client";
import { useCreateSshTicket } from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export function ProjectSshConnectionDrawer({
  onClose,
  projectSessionId,
}: {
  onClose: () => void;
  projectSessionId: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { isPending, mutateAsync } = useCreateSshTicket();
  const [connection, setConnection] = useState<CreateSshTicketResponse | null>(
    null,
  );
  const [hasError, setHasError] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestId = useRef(0);

  const generateConnection = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setConnection(null);
    setHasError(false);
    try {
      const result = await mutateAsync(projectSessionId);
      if (currentRequest === requestId.current) {
        setConnection(result);
        setNow(Date.now());
      }
    } catch {
      if (currentRequest === requestId.current) setHasError(true);
    }
  }, [mutateAsync, projectSessionId]);

  useEffect(() => {
    void generateConnection();
    return () => {
      requestId.current += 1;
    };
  }, [generateConnection]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = connection
    ? new Date(connection.expiresAt).getTime()
    : Number.NaN;
  const isValid = connection !== null && expiresAt > now;
  const remainingSeconds = isValid
    ? Math.max(0, Math.ceil((expiresAt - now) / 1_000))
    : 0;

  const copyValue = async (label: string, value: string) => {
    if (!connection || new Date(connection.expiresAt).getTime() <= Date.now()) {
      setNow(Date.now());
      Toast.show({ type: "error", text1: "SSH connection expired" });
      return;
    }
    try {
      await Clipboard.setStringAsync(value);
      Toast.show({ type: "success", text1: `${label} copied` });
    } catch {
      Toast.show({ type: "error", text1: `Could not copy ${label.toLowerCase()}` });
    }
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close SSH connection"
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
              maxHeight: height * 0.82,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          visible
        >
          <View
            style={[
              styles.handle,
              { backgroundColor: theme.backgroundSelected },
            ]}
          />
          <View style={styles.header}>
            <View style={styles.heading}>
              <ThemedText style={styles.title}>SSH connection</ThemedText>
              <ThemedText style={styles.subtitle} themeColor="textSecondary">
                Connect to this workspace from your terminal.
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel="Close SSH connection"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeButton}
            >
              <SymbolView
                name={{ ios: "xmark", android: "close" }}
                size={19}
                tintColor={theme.textSecondary}
              />
            </Pressable>
          </View>

          {isPending || (!connection && !hasError) ? (
            <View style={styles.status}>
              <ActivityIndicator />
              <ThemedText themeColor="textSecondary">
                Creating SSH connection…
              </ThemedText>
            </View>
          ) : isValid && connection ? (
            <>
              <ThemedText style={styles.expiry} themeColor="textSecondary">
                Username is single-use. Expires in {remainingSeconds}s.
              </ThemedText>
              <ScrollView
                contentContainerStyle={styles.fields}
                showsVerticalScrollIndicator={false}
              >
                <ConnectionField
                  label="SSH command"
                  onCopy={() =>
                    void copyValue("SSH command", formatSshCommand(connection))
                  }
                  value={formatSshCommand(connection)}
                />
                <ConnectionField
                  label="Username"
                  onCopy={() => void copyValue("Username", connection.username)}
                  value={connection.username}
                />
                <ConnectionField
                  label="Host"
                  onCopy={() => void copyValue("Host", connection.host)}
                  value={connection.host}
                />
                <ConnectionField
                  label="Port"
                  onCopy={() => void copyValue("Port", String(connection.port))}
                  value={String(connection.port)}
                />
              </ScrollView>
            </>
          ) : (
            <View style={styles.status}>
              <ThemedText style={styles.statusTitle}>
                {hasError ? "Could not create SSH connection" : "SSH connection expired"}
              </ThemedText>
              <ThemedText style={styles.statusCopy} themeColor="textSecondary">
                {hasError
                  ? "Try generating a new connection."
                  : "Generate a new username to connect."}
              </ThemedText>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isPending }}
            disabled={isPending}
            onPress={() => void generateConnection()}
            style={({ pressed }) => [
              styles.generateButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
              isPending && styles.disabled,
            ]}
          >
            <SymbolView
              name={{ ios: "arrow.clockwise", android: "refresh" }}
              size={17}
              tintColor={theme.text}
            />
            <ThemedText style={styles.generateLabel}>
              Generate new connection
            </ThemedText>
          </Pressable>
        </BottomDrawerPanel>
      </View>
    </Modal>
  );
}

function ConnectionField({
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
    <View
      style={[
        styles.field,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.fieldContent}>
        <ThemedText style={styles.fieldLabel} themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText selectable style={styles.fieldValue}>
          {value}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={`Copy ${label.toLowerCase()}`}
        accessibilityRole="button"
        onPress={onCopy}
        style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ ios: "doc.on.doc", android: "content_copy" }}
          size={18}
          tintColor={theme.textSecondary}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  closeButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  copyButton: {
    alignItems: "center",
    alignSelf: "stretch",
    justifyContent: "center",
    minHeight: 48,
    width: 48,
  },
  disabled: { opacity: 0.5 },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  expiry: { fontSize: 13, lineHeight: 19, marginTop: 16 },
  field: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingLeft: 12,
  },
  fieldContent: { flex: 1, gap: 5, minWidth: 0, paddingVertical: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600" },
  fieldValue: { fontFamily: "monospace", fontSize: 13, lineHeight: 19 },
  fields: { gap: 10, paddingVertical: 16 },
  generateButton: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 48,
    marginTop: 4,
  },
  generateLabel: { fontSize: 14, fontWeight: "700" },
  handle: {
    alignSelf: "center",
    borderRadius: 999,
    height: 4,
    marginBottom: 17,
    width: 38,
  },
  header: { alignItems: "flex-start", flexDirection: "row" },
  heading: { flex: 1, gap: 5 },
  pressed: { opacity: 0.65 },
  root: { flex: 1, justifyContent: "flex-end" },
  status: { alignItems: "center", gap: 10, paddingVertical: 38 },
  statusCopy: { fontSize: 13, textAlign: "center" },
  statusTitle: { fontSize: 15, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 13, lineHeight: 19 },
  title: { fontSize: 21, fontWeight: "700" },
});
