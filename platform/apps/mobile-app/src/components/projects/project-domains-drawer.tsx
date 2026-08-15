import {
  useAddAllowedIpToProject,
  useDeleteMultipleAllowedIpsFromProject,
  useGetProjectDomainsById,
  useUpdateProjectDomainAccess,
  useUpdateProjectDomainPort,
  useUpdateProjectRoutingTargetInstance,
} from "@repo/api-hooks";
import * as Clipboard from "expo-clipboard";
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
  Switch,
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
  const [editingDomain, setEditingDomain] = useState<{
    domain: string;
    id: string;
    port: number;
  } | null>(null);
  const [portInput, setPortInput] = useState("");
  const [copiedDomainId, setCopiedDomainId] = useState<string | null>(null);
  const [updatingDomainId, setUpdatingDomainId] = useState<string | null>(null);
  const domainsQuery = useGetProjectDomainsById(projectId, Boolean(projectId));
  const assignDomains = useUpdateProjectRoutingTargetInstance();
  const addAllowedIp = useAddAllowedIpToProject();
  const deleteAllowedIps = useDeleteMultipleAllowedIpsFromProject();
  const updateDomainAccess = useUpdateProjectDomainAccess();
  const updateDomainPort = useUpdateProjectDomainPort();
  const domains = domainsQuery.data;
  const orderedDomains = [...(domains?.proxy_domains ?? [])].sort(
    (left, right) => {
      if (left.is_editable !== right.is_editable) {
        return Number(right.is_editable) - Number(left.is_editable);
      }

      const leftChangedAt = new Date(
        left.updated_at ?? left.created_at,
      ).getTime();
      const rightChangedAt = new Date(
        right.updated_at ?? right.created_at,
      ).getTime();
      return rightChangedAt - leftChangedAt || left.domain.localeCompare(right.domain);
    },
  );
  const needsAssignment = Boolean(
    domains && domains.target_instance_id !== instanceId,
  );
  const allowedIps = [...(domains?.allowed_ips ?? [])].sort((left, right) =>
    left.ip.localeCompare(right.ip, undefined, { numeric: true }),
  );
  const currentIpAllowed = Boolean(
    currentIp && allowedIps.some((item) => item.ip.trim() === currentIp),
  );
  const requiresAllowedIp = Boolean(
    domains?.proxy_domains.some((domain) => !domain.allow_all_ips),
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

  const closePortEditor = () => {
    if (updateDomainPort.isPending) return;
    setEditingDomain(null);
    setPortInput("");
  };

  const closeDrawer = () => {
    setVisible(false);
    setEditingDomain(null);
    setPortInput("");
  };

  const editPort = (domain: {
    domain: string;
    id: string;
    is_editable: boolean;
    target_port: number;
  }) => {
    if (!domain.is_editable) {
      Alert.alert(
        "Managed domain",
        "This domain port is managed by the platform and cannot be changed.",
      );
      return;
    }
    setEditingDomain({
      domain: domain.domain,
      id: domain.id,
      port: domain.target_port,
    });
    setPortInput(String(domain.target_port));
  };

  const savePort = () => {
    if (!editingDomain || updateDomainPort.isPending) return;
    const port = Number(portInput.trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      Alert.alert("Invalid port", "Enter a port between 1 and 65535.");
      return;
    }
    if (port === editingDomain.port) {
      closePortEditor();
      return;
    }

    setUpdatingDomainId(editingDomain.id);
    updateDomainPort.mutate(
      { id: projectId, domainId: editingDomain.id, target_port: port },
      {
        onError: (error) => Alert.alert("Could not update port", error.message),
        onSuccess: () => {
          setEditingDomain(null);
          setPortInput("");
        },
        onSettled: () => setUpdatingDomainId(null),
      },
    );
  };

  const setAllowAllIps = (domainId: string, allowAllIps: boolean) => {
    if (updateDomainAccess.isPending) return;
    setUpdatingDomainId(domainId);
    updateDomainAccess.mutate(
      { id: projectId, domainId, allow_all_ips: allowAllIps },
      {
        onError: (error) =>
          Alert.alert("Could not update domain access", error.message),
        onSettled: () => setUpdatingDomainId(null),
      },
    );
  };

  const openDomain = (domain: string) => {
    void Linking.openURL(`https://${domain}`).catch(() =>
      Alert.alert("Could not open domain", domain),
    );
  };

  const copyDomain = (id: string, domain: string) => {
    void Clipboard.setStringAsync(`https://${domain}`).then(() => {
      setCopiedDomainId(id);
      setTimeout(() => setCopiedDomainId(null), 1500);
    });
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
          tintColor={
            needsAssignment ||
            (requiresAllowedIp && currentIp && !currentIpAllowed)
              ? "#f59e0b"
              : theme.textSecondary
          }
        />
      </Pressable>

      <Modal
        animationType="none"
        onRequestClose={closeDrawer}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <View style={styles.root}>
          <Pressable
            accessibilityLabel="Close project domains"
            accessibilityRole="button"
            onPress={closeDrawer}
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
              {requiresAllowedIp && currentIp && !currentIpAllowed ? (
                <View
                  style={[
                    styles.ipWarning,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    name={{
                      ios: "exclamationmark.triangle.fill",
                      android: "warning",
                    }}
                    size={20}
                    tintColor="#f59e0b"
                  />
                  <View style={styles.ipWarningCopy}>
                    <ThemedText style={styles.ipWarningTitle}>
                      This device is not allowed
                    </ThemedText>
                    <ThemedText
                      style={styles.ipWarningText}
                      themeColor="textSecondary"
                    >
                      Add {currentIp} to access these domains.
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityLabel={`Allow this device IP ${currentIp}`}
                    accessibilityRole="button"
                    disabled={ipMutationPending}
                    onPress={() => addIp(currentIp)}
                    style={({ pressed }) => [
                      styles.warningAllowButton,
                      ipMutationPending && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {addAllowedIp.isPending ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <ThemedText style={styles.warningAllowText}>
                        Allow
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              ) : null}

              {domainsQuery.isPending ? (
                <ActivityIndicator style={styles.loading} />
              ) : domainsQuery.error ? (
                <ThemedText
                  style={styles.centerCopy}
                  themeColor="textSecondary"
                >
                  {domainsQuery.error.message}
                </ThemedText>
              ) : orderedDomains.length ? (
                orderedDomains.map((domain) => (
                  <View
                    key={domain.id}
                    style={[
                      styles.domain,
                      { borderBottomColor: theme.backgroundSelected },
                    ]}
                  >
                    <View style={styles.domainHeader}>
                      <View style={styles.domainCopy}>
                        <ThemedText numberOfLines={1} style={styles.domainName}>
                          {domain.domain}
                        </ThemedText>
                      </View>
                      <View style={styles.domainHeaderActions}>
                        <Pressable
                          accessibilityLabel={`Copy URL for ${domain.domain}`}
                          accessibilityRole="button"
                          onPress={() => copyDomain(domain.id, domain.domain)}
                          style={({ pressed }) => [
                            styles.domainIconButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <SymbolView
                            name={
                              copiedDomainId === domain.id
                                ? { ios: "checkmark", android: "check" }
                                : { ios: "doc.on.doc", android: "content_copy" }
                            }
                            size={17}
                            tintColor={theme.textSecondary}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={`Open ${domain.domain}`}
                          accessibilityRole="link"
                          onPress={() => openDomain(domain.domain)}
                          style={({ pressed }) => [
                            styles.domainIconButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <SymbolView
                            name={{ ios: "arrow.up.right", android: "open_in_new" }}
                            size={17}
                            tintColor={theme.textSecondary}
                          />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.domainActions}>
                      <Pressable
                        accessibilityLabel={
                          domain.is_editable
                            ? `Edit port ${domain.target_port} for ${domain.domain}`
                            : `Port ${domain.target_port} is managed by the platform`
                        }
                        accessibilityRole="button"
                        disabled={updatingDomainId === domain.id}
                        onPress={() => editPort(domain)}
                        style={({ pressed }) => [
                          styles.portButton,
                          {
                            backgroundColor: theme.backgroundElement,
                            borderColor: theme.backgroundSelected,
                          },
                          updatingDomainId === domain.id && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <SymbolView
                          name={
                            domain.is_editable
                              ? { ios: "pencil", android: "edit" }
                              : { ios: "lock.fill", android: "lock" }
                          }
                          size={14}
                          tintColor={theme.textSecondary}
                        />
                        <ThemedText style={styles.port}>
                          Port {domain.target_port}
                        </ThemedText>
                      </Pressable>

                      <View style={styles.accessToggle}>
                        <ThemedText
                          style={styles.accessToggleLabel}
                          themeColor="textSecondary"
                        >
                          All IPs
                        </ThemedText>
                        {updatingDomainId === domain.id &&
                        updateDomainAccess.isPending ? (
                          <ActivityIndicator size="small" />
                        ) : (
                          <Switch
                            accessibilityLabel={`Allow all IPs for ${domain.domain}`}
                            disabled={updatingDomainId === domain.id}
                            ios_backgroundColor={theme.backgroundSelected}
                            onValueChange={(value) =>
                              setAllowAllIps(domain.id, value)
                            }
                            thumbColor="#ffffff"
                            trackColor={{
                              false: theme.backgroundSelected,
                              true: "#3c87f7",
                            }}
                            value={domain.allow_all_ips}
                          />
                        )}
                      </View>
                    </View>
                  </View>
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

          {editingDomain ? (
            <View accessibilityViewIsModal style={styles.dialogLayer}>
              <Pressable
                accessibilityLabel="Cancel port editing"
                accessibilityRole="button"
                disabled={updateDomainPort.isPending}
                onPress={closePortEditor}
                style={styles.dialogBackdrop}
              />
              <View
                style={[
                  styles.dialog,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.backgroundSelected,
                  },
                ]}
              >
                <View style={styles.dialogIcon}>
                  <SymbolView
                    name={{ ios: "pencil", android: "edit" }}
                    size={20}
                    tintColor="#3c87f7"
                  />
                </View>
                <ThemedText style={styles.dialogTitle}>Edit port</ThemedText>
                <ThemedText
                  numberOfLines={1}
                  style={styles.dialogDomain}
                  themeColor="textSecondary"
                >
                  {editingDomain.domain}
                </ThemedText>
                <ThemedText
                  style={styles.dialogLabel}
                  themeColor="textSecondary"
                >
                  Target port
                </ThemedText>
                <TextInput
                  accessibilityLabel={`Target port for ${editingDomain.domain}`}
                  autoFocus
                  editable={!updateDomainPort.isPending}
                  keyboardType="number-pad"
                  maxLength={5}
                  onChangeText={setPortInput}
                  onSubmitEditing={savePort}
                  placeholder="3101"
                  placeholderTextColor={theme.textSecondary}
                  returnKeyType="done"
                  selectTextOnFocus
                  style={[
                    styles.portInput,
                    {
                      backgroundColor: theme.backgroundElement,
                      borderColor: theme.backgroundSelected,
                      color: theme.text,
                    },
                  ]}
                  value={portInput}
                />
                <ThemedText
                  style={styles.dialogHint}
                  themeColor="textSecondary"
                >
                  Enter a port from 1 to 65535.
                </ThemedText>
                <View style={styles.dialogActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={updateDomainPort.isPending}
                    onPress={closePortEditor}
                    style={({ pressed }) => [
                      styles.dialogCancel,
                      { borderColor: theme.backgroundSelected },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.dialogCancelText}>
                      Cancel
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!portInput.trim() || updateDomainPort.isPending}
                    onPress={savePort}
                    style={({ pressed }) => [
                      styles.dialogSave,
                      (!portInput.trim() || updateDomainPort.isPending) &&
                        styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    {updateDomainPort.isPending ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <ThemedText style={styles.dialogSaveText}>
                        Save
                      </ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  accessToggle: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
  },
  accessToggleLabel: { fontSize: 12, fontWeight: "600" },
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingVertical: 12,
  },
  domainActions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  domainCopy: { flex: 1, minWidth: 0 },
  domainHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 34,
  },
  domainHeaderActions: { flexDirection: "row", gap: 4 },
  domainIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  domainList: { paddingTop: 12 },
  domainName: { fontSize: 14, fontWeight: "700" },
  dialog: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 360,
    padding: 20,
    width: "88%",
  },
  dialogActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  dialogBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dialogCancel: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  dialogCancelText: { fontSize: 14, fontWeight: "700" },
  dialogDomain: { fontSize: 12, marginTop: 3 },
  dialogHint: { fontSize: 11, marginTop: 7 },
  dialogIcon: {
    alignItems: "center",
    backgroundColor: "rgba(60, 135, 247, 0.12)",
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    marginBottom: 12,
    width: 40,
  },
  dialogLabel: { fontSize: 12, fontWeight: "600", marginTop: 20 },
  dialogLayer: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  dialogSave: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 12,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
  },
  dialogSaveText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  dialogTitle: { fontSize: 18, fontWeight: "700" },
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
  ipWarning: {
    alignItems: "center",
    borderColor: "#f59e0b",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    padding: 12,
  },
  ipWarningCopy: { flex: 1, minWidth: 0 },
  ipWarningText: { fontSize: 11, lineHeight: 16 },
  ipWarningTitle: { fontSize: 13, fontWeight: "700" },
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
  port: { fontFamily: "monospace", fontSize: 12, fontWeight: "600" },
  portButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  portInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: "monospace",
    fontSize: 18,
    height: 50,
    marginTop: 7,
    paddingHorizontal: 14,
  },
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
  warningAllowButton: {
    alignItems: "center",
    backgroundColor: "#3c87f7",
    borderRadius: 9,
    height: 36,
    justifyContent: "center",
    minWidth: 62,
    paddingHorizontal: 10,
  },
  warningAllowText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
});
