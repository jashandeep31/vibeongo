import {
  completeOpencodeProviderOauth,
  connectOpencodeProviderKey,
  getOpencodeProviderIntegrations,
  getOpencodeProviderOauthStatus,
  type OpencodeProviderConnectMethod,
  type OpencodeProviderIntegration,
  startOpencodeProviderOauth,
} from "@repo/api-client";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

export type OpencodeProviderConnection = {
  accessToken: string;
  chatId: string;
  directory?: string;
  onConnected: () => void | Promise<void>;
  password?: string;
  serverUrl: string;
};

type ProviderConnectRow = {
  connected?: boolean;
  id: string;
  label: string;
  method?: OpencodeProviderConnectMethod;
  provider?: OpencodeProviderIntegration;
};

export function OpencodeProviderConnectSheet({
  connection,
  onClose,
  visible,
}: {
  connection: OpencodeProviderConnection;
  onClose: () => void;
  visible: boolean;
}) {
  const theme = useTheme();
  const [providers, setProviders] = useState<OpencodeProviderIntegration[]>([]);
  const [provider, setProvider] = useState<OpencodeProviderIntegration>();
  const [method, setMethod] = useState<OpencodeProviderConnectMethod>();
  const [attempt, setAttempt] =
    useState<Awaited<ReturnType<typeof startOpencodeProviderOauth>>>();
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const location = [connection.directory, connection.password] as const;
  const finish = async () => {
    await connection.onConnected();
    onClose();
  };

  useEffect(() => {
    if (!visible) return;
    setProvider(undefined);
    setMethod(undefined);
    setAttempt(undefined);
    setValue("");
    setSearch("");
    setError("");
    setCopied(false);
    setBusy(true);
    void getOpencodeProviderIntegrations(
      connection.chatId,
      connection.serverUrl,
      connection.accessToken,
      ...location,
    )
      .then(setProviders)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setBusy(false));
  }, [
    connection.accessToken,
    connection.chatId,
    connection.directory,
    connection.password,
    connection.serverUrl,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !provider || !attempt || attempt.mode !== "auto") return;
    const timer = setInterval(() => {
      void getOpencodeProviderOauthStatus(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        provider.id,
        attempt.attemptID,
        ...location,
      )
        .then((status) => {
          if (status.status === "complete") void finish();
          if (status.status === "failed") setError(status.message);
          if (status.status === "expired")
            setError("Authorization expired. Try again.");
        })
        .catch(() => undefined);
    }, 1_000);
    return () => clearInterval(timer);
  }, [
    attempt,
    connection.accessToken,
    connection.chatId,
    connection.directory,
    connection.password,
    connection.serverUrl,
    provider,
    visible,
  ]);

  const selectMethod = async (next: OpencodeProviderConnectMethod) => {
    setMethod(next);
    setError("");
    if (next.type !== "oauth" || !provider) return;
    setBusy(true);
    try {
      const authorization = await startOpencodeProviderOauth(
        connection.chatId,
        connection.serverUrl,
        connection.accessToken,
        provider.id,
        next.id,
        ...location,
      );
      setAttempt(authorization);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    if (!provider || !method || !value.trim()) return;
    setBusy(true);
    setError("");
    try {
      if (method.type === "key") {
        await connectOpencodeProviderKey(
          connection.chatId,
          connection.serverUrl,
          connection.accessToken,
          provider.id,
          value.trim(),
          ...location,
        );
      } else if (attempt) {
        await completeOpencodeProviderOauth(
          connection.chatId,
          connection.serverUrl,
          connection.accessToken,
          provider.id,
          attempt.attemptID,
          value.trim(),
          ...location,
        );
      }
      await finish();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (method) {
      setMethod(undefined);
      setAttempt(undefined);
      setValue("");
    } else if (provider) setProvider(undefined);
    else onClose();
  };

  const title = method
    ? `Connect ${provider?.name}`
    : provider
      ? "Choose connection method"
      : "Connect provider";
  const verificationCode = attempt?.instructions.match(
    /(?:enter|confirmation)\s+code:\s*([^\s.]+)/i,
  )?.[1];
  const copyAuthorization = async () => {
    const content = verificationCode ?? attempt?.instructions;
    if (!content) return;
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  };
  const rows: ProviderConnectRow[] = provider
    ? provider.methods.map((item) => ({
        id: `${item.type}:${item.id ?? item.label}`,
        label: item.label,
        method: item,
      }))
    : providers
        .filter((item) =>
          `${item.name} ${item.id}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
        )
        .map((item) => ({
          id: item.id,
          label: item.name,
          provider: item,
          connected: item.connected,
        }));

  return (
    <Modal
      animationType="slide"
      onRequestClose={back}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        style={[styles.screen, { backgroundColor: theme.background }]}
      >
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.backgroundSelected },
          ]}
        >
          <Pressable
            accessibilityLabel="Back"
            onPress={back}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back" }}
              size={20}
              tintColor={theme.text}
            />
          </Pressable>
          <ThemedText style={styles.title}>{title}</ThemedText>
          <Pressable
            accessibilityLabel="Close"
            onPress={onClose}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ ios: "xmark", android: "close" }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
        </View>
        {!provider && !method && !busy ? (
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="Search providers"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.search,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.backgroundSelected,
                color: theme.text,
              },
            ]}
            value={search}
          />
        ) : null}
        {method ? (
          <View style={styles.form}>
            {method.type === "oauth" ? (
              <>
                <ThemedText style={styles.authHeading}>
                  Authorize in your browser
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {attempt?.instructions || "Preparing authorization…"}
                </ThemedText>
                {verificationCode ? (
                  <Pressable
                    accessibilityLabel="Copy authorization code"
                    onPress={() => void copyAuthorization()}
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: theme.backgroundElement,
                        borderColor: theme.backgroundSelected,
                      },
                    ]}
                  >
                    <ThemedText selectable style={styles.codeText}>
                      {verificationCode}
                    </ThemedText>
                    <View style={styles.copyLabel}>
                      <SymbolView
                        name={{
                          ios: copied ? "checkmark" : "doc.on.doc",
                          android: copied ? "check" : "content_copy",
                        }}
                        size={17}
                        tintColor={theme.textSecondary}
                      />
                      <ThemedText
                        style={styles.copyText}
                        themeColor="textSecondary"
                      >
                        {copied ? "Copied" : "Copy"}
                      </ThemedText>
                    </View>
                  </Pressable>
                ) : null}
                {attempt?.url ? (
                  <Pressable
                    accessibilityLabel="Open authorization page"
                    onPress={() => void Linking.openURL(attempt.url)}
                    style={[styles.connect, { backgroundColor: theme.text }]}
                  >
                    <ThemedText style={{ color: theme.background }}>
                      Open authorization page
                    </ThemedText>
                  </Pressable>
                ) : null}
              </>
            ) : null}
            {method.type === "key" || attempt?.mode === "code" ? (
              <>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setValue}
                  placeholder={
                    method.type === "key" ? "API key" : "Authorization code"
                  }
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={method.type === "key"}
                  style={[
                    styles.input,
                    {
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={value}
                />
                <Pressable
                  disabled={busy || !value.trim()}
                  onPress={() => void connect()}
                  style={[
                    styles.connect,
                    { backgroundColor: theme.text },
                    (busy || !value.trim()) && styles.disabled,
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator color={theme.background} />
                  ) : (
                    <ThemedText style={{ color: theme.background }}>
                      Connect
                    </ThemedText>
                  )}
                </Pressable>
              </>
            ) : !attempt ? (
              <ActivityIndicator />
            ) : null}
          </View>
        ) : busy ? (
          <ActivityIndicator style={styles.loading} />
        ) : (
          <FlatList
            contentContainerStyle={styles.list}
            data={rows}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <ThemedText themeColor="textSecondary">
                No providers available to connect.
              </ThemedText>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() =>
                  provider
                    ? void selectMethod(item.method!)
                    : setProvider(item.provider!)
                }
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: theme.backgroundSelected },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText style={styles.rowTitle}>{item.label}</ThemedText>
                {item.method?.type === "oauth" &&
                !item.method.label.toLowerCase().includes("headless") ? (
                  <SymbolView
                    accessibilityLabel="May require a callback reachable from this device"
                    name={{
                      ios: "exclamationmark.triangle.fill",
                      android: "warning",
                    }}
                    size={18}
                    tintColor="#f59e0b"
                  />
                ) : null}
                <SymbolView
                  name={
                    item.connected
                      ? {
                          ios: "checkmark.circle.fill",
                          android: "check_circle",
                        }
                      : { ios: "chevron.right", android: "chevron_right" }
                  }
                  size={item.connected ? 21 : 16}
                  tintColor={item.connected ? theme.text : theme.textSecondary}
                />
              </Pressable>
            )}
          />
        )}
        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: 16,
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  title: { flex: 1, fontSize: 18, fontWeight: "700" },
  loading: { marginTop: 40 },
  list: { paddingBottom: 32, paddingHorizontal: 24, paddingTop: 8 },
  search: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    height: 44,
    marginHorizontal: 24,
    marginTop: 24,
    paddingHorizontal: 16,
  },
  row: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  form: { gap: 16, padding: 20 },
  authHeading: { fontSize: 18, fontWeight: "700" },
  codeBox: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  codeText: { fontSize: 20, fontWeight: "700", letterSpacing: 2 },
  copyLabel: { alignItems: "center", flexDirection: "row", gap: 6 },
  copyText: { fontSize: 13 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  connect: {
    alignItems: "center",
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
  },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  error: { color: "#ef4444", paddingHorizontal: 20, paddingVertical: 12 },
});
