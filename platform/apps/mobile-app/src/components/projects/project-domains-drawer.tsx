import {
  useAddAllowedIpToProject,
  useDeleteMultipleAllowedIpsFromProject,
  useGetProjectDomainsById,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { useTheme } from "@/hooks/use-theme";

export function ProjectDomainsButton({
  instanceId,
  projectId,
}: {
  instanceId: string;
  projectId: string;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [currentIp, setCurrentIp] = useState("");
  const [manualIp, setManualIp] = useState("");
  const [isCurrentIpLoading, setIsCurrentIpLoading] = useState(false);
  const domainsQuery = useGetProjectDomainsById(projectId, Boolean(projectId));
  const assignDomains = useUpdateProjectRoutingTargetInstance();
  const addAllowedIp = useAddAllowedIpToProject();
  const deleteAllowedIps = useDeleteMultipleAllowedIpsFromProject();
  const domains = domainsQuery.data;
  const needsAssignment = Boolean(
    domains && domains.target_instance_id !== instanceId,
  );
  const allowedIps = [...(domains?.allowed_ips ?? [])].sort((left, right) =>
    left.ip.localeCompare(right.ip, undefined, { numeric: true }),
  );
  const currentIpAllowed = Boolean(
    currentIp && allowedIps.some((item) => item.ip.trim() === currentIp),
  );
  const otherIps = currentIp
    ? allowedIps.filter((item) => item.ip.trim() !== currentIp)
    : [];
  const ipMutationPending =
    addAllowedIp.isPending || deleteAllowedIps.isPending;

  useEffect(() => {
    if (!visible) return;
    const ipDomain = domains?.proxy_domains.find(
      (domain) => domain.target_port === 3101,
    )?.domain;
    if (!ipDomain) {
      setCurrentIp("");
      return;
    }

    let cancelled = false;
    setIsCurrentIpLoading(true);
    void fetch(`https://${ipDomain}/proxy/my-ip`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not detect IP");
        const body = (await response.json()) as { ip?: string };
        if (!cancelled) setCurrentIp(body.ip?.trim() ?? "");
      })
      .catch(() => {
        if (!cancelled) setCurrentIp("");
      })
      .finally(() => {
        if (!cancelled) setIsCurrentIpLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [domains?.proxy_domains, visible]);

  const addIp = (value: string) => {
    const ip = value.trim();
    if (!/^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}$/.test(ip)) {
      Alert.alert(
        "Invalid IP address",
        "Enter an IPv4 address such as 203.0.113.10.",
      );
      return;
    }
    if (allowedIps.some((item) => item.ip.trim() === ip)) {
      Alert.alert("IP already allowed", `${ip} is already in the allowlist.`);
      return;
    }

    addAllowedIp.mutate(
      { id: projectId, ip },
      {
        onError: (error) => Alert.alert("Could not add IP", error.message),
        onSuccess: () => setManualIp(""),
      },
    );
  };

  const removeIps = (ids: string[], description: string) => {
    if (!ids.length) return;
    Alert.alert("Remove allowed IP?", description, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          deleteAllowedIps.mutate(
            { id: projectId, ids },
            {
              onError: (error) =>
                Alert.alert("Could not remove IP", error.message),
            },
          ),
      },
    ]);
  };

  const assign = () => {
    if (!instanceId || assignDomains.isPending) return;
    assignDomains.mutate(
      { id: projectId, instanceId },
      {
        onError: (error) =>
          Alert.alert("Could not assign domains", error.message),
      },
    );
  };

  const openDomain = (domain: string) => {
    void Linking.openURL(`https://${domain}`).catch(() =>
      Alert.alert("Could not open domain", domain),
    );
  };

  return (
    <>
      <Pressable
        accessibilityLabel="Project domains"
        accessibilityRole="button"
        onPress={() => setVisible(true)}
        style={({ pressed }) => [
          styles.headerAction,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ ios: "globe", android: "public" }}
          size={19}
          tintColor={needsAssignment ? "#3c87f7" : theme.textSecondary}
        />
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close project domains"
            accessibilityRole="button"
            onPress={() => setVisible(false)}
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
            <View style={styles.drawerHeader}>
              <View style={styles.drawerHeaderCopy}>
                <ThemedText style={styles.drawerTitle}>
                  Project domains
                </ThemedText>
                <ThemedText
                  style={styles.drawerSubtitle}
                  themeColor="textSecondary"
                >
                  Services routed to this project
                </ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Reload project domains"
                accessibilityRole="button"
                disabled={domainsQuery.isFetching}
                onPress={() => void domainsQuery.refetch()}
                style={({ pressed }) => [
                  styles.drawerAction,
                  { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                {domainsQuery.isFetching ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <SymbolView
                    name={{ ios: "arrow.clockwise", android: "refresh" }}
                    size={18}
                    tintColor={theme.textSecondary}
                  />
                )}
              </Pressable>
            </View>

            {needsAssignment ? (
              <Pressable
                accessibilityRole="button"
                disabled={assignDomains.isPending}
                onPress={assign}
                style={({ pressed }) => [
                  styles.assignButton,
                  pressed && styles.pressed,
                ]}
              >
                {assignDomains.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <ThemedText style={styles.assignText}>
                    Route domains to this session
                  </ThemedText>
                )}
              </Pressable>
            ) : null}

            <ScrollView
              contentContainerStyle={styles.domainList}
              keyboardShouldPersistTaps="handled"
            >
              {domainsQuery.isPending ? (
                <ActivityIndicator style={styles.loading} />
              ) : domainsQuery.error ? (
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  {domainsQuery.error.message}
                </ThemedText>
              ) : domains?.proxy_domains.length ? (
                domains.proxy_domains.map((domain) => (
                  <Pressable
                    accessibilityLabel={`Open ${domain.domain}`}
                    accessibilityRole="link"
                    key={domain.id}
                    onPress={() => openDomain(domain.domain)}
                    style={({ pressed }) => [
                      styles.domain,
                      { borderBottomColor: theme.backgroundSelected },
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.domainCopy}>
                      <ThemedText numberOfLines={1} style={styles.domainName}>
                        {domain.domain}
                      </ThemedText>
                      <ThemedText
                        style={styles.port}
                        themeColor="textSecondary"
                      >
                        Port {domain.target_port}
                      </ThemedText>
                    </View>
                    <SymbolView
                      name={{ ios: "arrow.up.right", android: "open_in_new" }}
                      size={17}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                ))
              ) : (
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  No project domains configured.
                </ThemedText>
              )}

              {domains ? (
                <View style={styles.ipSection}>
                  <View style={styles.sectionHeader}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <SymbolView
                        name={{ ios: "network", android: "lan" }}
                        size={17}
                        tintColor={theme.textSecondary}
                      />
                    </View>
                    <View style={styles.sectionCopy}>
                      <ThemedText style={styles.sectionTitle}>
                        Allowed IPs
                      </ThemedText>
                      <ThemedText
                        style={styles.sectionSubtitle}
                        themeColor="textSecondary"
                      >
                        Control who can access project domains
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: theme.backgroundElement },
                      ]}
                    >
                      <ThemedText style={styles.countText}>
                        {allowedIps.length}
                      </ThemedText>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.currentIpCard,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <View style={styles.currentIpCopy}>
                      <ThemedText
                        style={styles.currentIpLabel}
                        themeColor="textSecondary"
                      >
                        This device
                      </ThemedText>
                      <ThemedText style={styles.currentIpValue}>
                        {isCurrentIpLoading
                          ? "Detecting…"
                          : currentIp || "IP unavailable"}
                      </ThemedText>
                    </View>
                    {currentIp && !currentIpAllowed ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={ipMutationPending}
                        onPress={() => addIp(currentIp)}
                        style={({ pressed }) => [
                          styles.allowButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        {addAllowedIp.isPending ? (
                          <ActivityIndicator color="#ffffff" size="small" />
                        ) : (
                          <ThemedText style={styles.allowText}>
                            Allow
                          </ThemedText>
                        )}
                      </Pressable>
                    ) : currentIpAllowed ? (
                      <View style={styles.allowedState}>
                        <SymbolView
                          name={{
                            ios: "checkmark.circle.fill",
                            android: "check_circle",
                          }}
                          size={18}
                          tintColor="#10b981"
                        />
                        <ThemedText style={styles.allowedText}>
                          Allowed
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.addIpRow}>
                    <TextInput
                      editable={!ipMutationPending}
                      keyboardType="numbers-and-punctuation"
                      onChangeText={setManualIp}
                      onSubmitEditing={() => addIp(manualIp)}
                      placeholder="203.0.113.10"
                      placeholderTextColor={theme.textSecondary}
                      style={[
                        styles.ipInput,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: theme.backgroundSelected,
                          color: theme.text,
                        },
                      ]}
                      value={manualIp}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={!manualIp.trim() || ipMutationPending}
                      onPress={() => addIp(manualIp)}
                      style={({ pressed }) => [
                        styles.addIpButton,
                        (!manualIp.trim() || ipMutationPending) &&
                          styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      {addAllowedIp.isPending ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <ThemedText style={styles.addIpText}>Add IP</ThemedText>
                      )}
                    </Pressable>
                  </View>

                  {allowedIps.length ? (
                    <View
                      style={[
                        styles.ipList,
                        { borderColor: theme.backgroundSelected },
                      ]}
                    >
                      {allowedIps.map((item, index) => (
                        <View
                          key={item.id}
                          style={[
                            styles.ipRow,
                            index < allowedIps.length - 1 && {
                              borderBottomColor: theme.backgroundSelected,
                              borderBottomWidth: StyleSheet.hairlineWidth,
                            },
                          ]}
                        >
                          <ThemedText style={styles.ipValue}>
                            {item.ip}
                          </ThemedText>
                          {item.ip.trim() === currentIp ? (
                            <ThemedText
                              style={styles.thisDevice}
                              themeColor="textSecondary"
                            >
                              This device
                            </ThemedText>
                          ) : null}
                          <Pressable
                            accessibilityLabel={`Remove ${item.ip}`}
                            accessibilityRole="button"
                            disabled={ipMutationPending}
                            onPress={() =>
                              removeIps(
                                [item.id],
                                `Remove ${item.ip} from the allowlist?`,
                              )
                            }
                            style={styles.removeIpButton}
                          >
                            <SymbolView
                              name={{ ios: "trash", android: "delete" }}
                              size={17}
                              tintColor="#ef4444"
                            />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <ThemedText style={styles.noIps} themeColor="textSecondary">
                      No IP addresses have been added.
                    </ThemedText>
                  )}

                  {currentIpAllowed && otherIps.length ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={ipMutationPending}
                      onPress={() =>
                        removeIps(
                          otherIps.map((item) => item.id),
                          `Remove ${otherIps.length} other IP${otherIps.length === 1 ? "" : "s"} and keep ${currentIp}?`,
                        )
                      }
                      style={({ pressed }) => [
                        styles.removeOthers,
                        { borderColor: theme.backgroundSelected },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.removeOthersText}>
                        {deleteAllowedIps.isPending
                          ? "Removing…"
                          : "Remove other IPs"}
                      </ThemedText>
                    </Pressable>
                  ) : null}

                  <ThemedText
                    style={styles.footnote}
                    themeColor="textSecondary"
                  >
                    Access changes can take up to 30 seconds.
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </BottomDrawerPanel>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  addIpButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: 12,
  },
  addIpRow: { flexDirection: "row", gap: 8 },
  addIpText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },
  allowedState: { alignItems: "center", flexDirection: "row", gap: 5 },
  allowedText: { color: "#10b981", fontSize: 12, fontWeight: "700" },
  allowButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    minWidth: 64,
    paddingHorizontal: 12,
  },
  allowText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  assignButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  assignText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  centerCopy: { paddingVertical: 32, textAlign: "center" },
  countBadge: {
    alignItems: "center",
    borderRadius: 12,
    height: 24,
    justifyContent: "center",
    minWidth: 24,
    paddingHorizontal: 7,
  },
  countText: { fontSize: 11, fontWeight: "700" },
  currentIpCard: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  currentIpCopy: { flex: 1, minWidth: 0 },
  currentIpLabel: { fontSize: 11 },
  currentIpValue: { fontFamily: "monospace", fontSize: 13, marginTop: 2 },
  disabled: { opacity: 0.4 },
  domain: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
  },
  domainCopy: { flex: 1, minWidth: 0 },
  domainList: { paddingTop: 12 },
  domainName: { fontSize: 14, fontWeight: "700" },
  drawer: {
    alignSelf: "center",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    maxHeight: "78%",
    maxWidth: 620,
    paddingHorizontal: 20,
    position: "absolute",
    width: "100%",
  },
  drawerAction: {
    alignItems: "center",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  drawerHeader: { alignItems: "center", flexDirection: "row", gap: 12 },
  drawerHeaderCopy: { flex: 1 },
  drawerSubtitle: { fontSize: 12, lineHeight: 17 },
  drawerTitle: { fontSize: 18, fontWeight: "700" },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 16,
    marginTop: 8,
    width: 36,
  },
  headerAction: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  footnote: { fontSize: 11, lineHeight: 16, textAlign: "center" },
  ipInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontFamily: "monospace",
    height: 44,
    minWidth: 0,
    paddingHorizontal: 12,
  },
  ipList: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  ipRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: 12,
    paddingRight: 4,
  },
  ipSection: { gap: 12, marginTop: 28 },
  ipValue: { flex: 1, fontFamily: "monospace", fontSize: 13 },
  loading: { marginVertical: 32 },
  noIps: { fontSize: 12, paddingVertical: 12, textAlign: "center" },
  port: { fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.6 },
  removeIpButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  removeOthers: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
    justifyContent: "center",
  },
  removeOthersText: { color: "#ef4444", fontSize: 12, fontWeight: "700" },
  root: { flex: 1, justifyContent: "flex-end" },
  sectionCopy: { flex: 1 },
  sectionHeader: { alignItems: "center", flexDirection: "row", gap: 10 },
  sectionIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  sectionSubtitle: { fontSize: 11, lineHeight: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  thisDevice: { fontSize: 10, marginRight: 3 },
});
