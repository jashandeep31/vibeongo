import {
  formatSshCommand,
  type CreateSshAccessResponse,
} from "@repo/api-client";
import {
  useCreateSshAccess,
  useRevokeSshAccess,
  useSshAccess,
} from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
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

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProjectSshConnectionDrawer({
  onClose,
  instanceId,
}: {
  onClose: () => void;
  instanceId: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const createAccess = useCreateSshAccess();
  const revokeAccess = useRevokeSshAccess();
  const accessList = useSshAccess(instanceId);
  const [connection, setConnection] = useState<CreateSshAccessResponse | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);
  const connectionIsValid =
    connection !== null &&
    new Date(connection.expiresAt).getTime() > now &&
    accessList.data?.find((access) => access.id === connection.id)?.status !==
      "revoked";

  const generateConnection = async () => {
    setConnection(null);
    try {
      setConnection(await createAccess.mutateAsync(instanceId));
      setNow(Date.now());
    } catch {
      Toast.show({ type: "error", text1: "Could not create SSH access" });
    }
  };

  const copyValue = async (label: string, value: string) => {
    if (
      !connection ||
      new Date(connection.expiresAt).getTime() <= Date.now() ||
      accessList.data?.find((access) => access.id === connection.id)?.status ===
        "revoked"
    ) {
      Toast.show({ type: "error", text1: "SSH access expired or revoked" });
      return;
    }
    try {
      await Clipboard.setStringAsync(value);
      Toast.show({ type: "success", text1: `${label} copied` });
    } catch {
      Toast.show({
        type: "error",
        text1: `Could not copy ${label.toLowerCase()}`,
      });
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
                Access this workspace from your terminal for 60 minutes.
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

          <ScrollView
            contentContainerStyle={styles.fields}
            showsVerticalScrollIndicator={false}
          >
            {connectionIsValid && connection ? (
              <>
                <ThemedText style={styles.expiry} themeColor="textSecondary">
                  Copy these details now. They cannot be shown again after
                  closing this drawer.
                </ThemedText>
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
                <ThemedText style={styles.expiry} themeColor="textSecondary">
                  Expires {dateFormatter.format(new Date(connection.expiresAt))}
                  .
                </ThemedText>
              </>
            ) : null}

            <ThemedText style={styles.sectionTitle}>
              Created SSH access
            </ThemedText>
            {accessList.isPending ? (
              <View style={styles.status}>
                <ActivityIndicator />
              </View>
            ) : accessList.isError ? (
              <ThemedText themeColor="textSecondary">
                Could not load SSH access.
              </ThemedText>
            ) : accessList.data?.length ? (
              accessList.data.map((access) => {
                const status = access.revokedAt
                  ? "Revoked"
                  : new Date(access.expiresAt).getTime() <= now
                    ? "Expired"
                    : access.status === "instance_unavailable"
                      ? "Instance unavailable"
                      : "Active";
                return (
                  <View
                    key={access.id}
                    style={[
                      styles.accessRow,
                      { borderColor: theme.backgroundSelected },
                    ]}
                  >
                    <View style={styles.accessDetails}>
                      <ThemedText style={styles.accessTitle}>
                        {status} · Created{" "}
                        {dateFormatter.format(new Date(access.createdAt))}
                      </ThemedText>
                      <ThemedText
                        style={styles.subtitle}
                        themeColor="textSecondary"
                      >
                        Expires{" "}
                        {dateFormatter.format(new Date(access.expiresAt))}
                        {access.lastUsedAt
                          ? ` · Last used ${dateFormatter.format(new Date(access.lastUsedAt))}`
                          : ""}
                      </ThemedText>
                    </View>
                    {!access.revokedAt &&
                    new Date(access.expiresAt).getTime() > now ? (
                      <Pressable
                        accessibilityLabel="Revoke SSH access"
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled: revokeAccess.isPending,
                        }}
                        disabled={revokeAccess.isPending}
                        onPress={() =>
                          revokeAccess.mutate(
                            { instanceId, accessId: access.id },
                            {
                              onSuccess: () => {
                                if (connection?.id === access.id)
                                  setConnection(null);
                                Toast.show({
                                  type: "success",
                                  text1: "SSH access revoked",
                                });
                              },
                              onError: () =>
                                Toast.show({
                                  type: "error",
                                  text1: "Could not revoke SSH access",
                                }),
                            },
                          )
                        }
                        style={styles.revokeButton}
                      >
                        <ThemedText style={styles.revokeLabel}>
                          Revoke
                        </ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <ThemedText themeColor="textSecondary">
                No SSH access created yet.
              </ThemedText>
            )}
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: createAccess.isPending }}
            disabled={createAccess.isPending}
            onPress={() => void generateConnection()}
            style={({ pressed }) => [
              styles.generateButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
              createAccess.isPending && styles.disabled,
            ]}
          >
            {createAccess.isPending ? (
              <ActivityIndicator size="small" />
            ) : (
              <SymbolView
                name={{ ios: "plus", android: "add" }}
                size={17}
                tintColor={theme.text}
              />
            )}
            <ThemedText style={styles.generateLabel}>
              {createAccess.isPending ? "Creating…" : "Create SSH access"}
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
  accessDetails: { flex: 1, gap: 4 },
  accessRow: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  accessTitle: { fontSize: 13, fontWeight: "600" },
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
  expiry: { fontSize: 13, lineHeight: 19 },
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
  revokeButton: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  revokeLabel: { fontSize: 13, fontWeight: "600" },
  root: { flex: 1, justifyContent: "flex-end" },
  sectionTitle: { fontSize: 14, fontWeight: "700", marginTop: 10 },
  status: { alignItems: "center", paddingVertical: 20 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  title: { fontSize: 21, fontWeight: "700" },
});
