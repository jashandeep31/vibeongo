import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import {
  Radius,
  Spacing,
  TouchTarget,
  type AppColors,
} from "@/constants/theme";

import {
  addProjectAllowedIp,
  assignProjectDomains,
  deleteProjectAllowedIps,
  getCurrentIp,
  getProjectDomains,
  updateProjectDomain,
  type ProjectDomain,
  type ProjectDomains,
} from "./project-domains-api";

export function ProjectDomainsButton({
  colors,
  instanceId,
  projectId,
}: {
  colors: AppColors;
  instanceId: string;
  projectId: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<ProjectDomains | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const needsAssignment = Boolean(
    data && data.target_instance_id !== instanceId,
  );

  const load = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setData(await getProjectDomains(projectId));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Could not load domains.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pressButton = async () => {
    if (!needsAssignment) {
      setOpen(true);
      if (!data) void load();
      return;
    }

    setIsAssigning(true);
    try {
      await assignProjectDomains(projectId, instanceId);
      await load();
      Alert.alert(
        "Domains assigned",
        "Project domains now route to this session.",
      );
    } catch (error) {
      Alert.alert(
        "Could not assign domains",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <>
      <Pressable
        accessibilityLabel={
          needsAssignment ? "Assign project domains" : "Project domains"
        }
        accessibilityRole="button"
        disabled={isAssigning}
        onPress={() => void pressButton()}
        style={({ pressed }) => [
          styles.headerButton,
          needsAssignment && { backgroundColor: colors.brand },
          pressed && styles.pressed,
        ]}
      >
        {isAssigning ? (
          <ActivityIndicator color={colors.primaryForeground} size="small" />
        ) : (
          <AppIcon
            name={{ ios: "globe", android: "public", web: "public" }}
            size={19}
            tintColor={
              needsAssignment ? colors.primaryForeground : colors.textSecondary
            }
          />
        )}
      </Pressable>
      <ProjectDomainsSheet
        colors={colors}
        data={data}
        error={loadError}
        isLoading={isLoading}
        onChange={setData}
        onClose={() => setOpen(false)}
        onReload={load}
        projectId={projectId}
        visible={open}
      />
    </>
  );
}

function ProjectDomainsSheet({
  colors,
  data,
  error,
  isLoading,
  onChange,
  onClose,
  onReload,
  projectId,
  visible,
}: {
  colors: AppColors;
  data: ProjectDomains | null;
  error: string | null;
  isLoading: boolean;
  onChange: (data: ProjectDomains) => void;
  onClose: () => void;
  onReload: () => Promise<void>;
  projectId: string;
  visible: boolean;
}) {
  const [currentIp, setCurrentIp] = useState("");
  const [newIp, setNewIp] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [editingDomainId, setEditingDomainId] = useState<string | null>(null);
  const [port, setPort] = useState("");
  const domains = useMemo(
    () =>
      [...(data?.proxy_domains ?? [])].sort(
        (left, right) =>
          left.target_port - right.target_port ||
          left.domain.localeCompare(right.domain),
      ),
    [data?.proxy_domains],
  );
  const allowedIps = useMemo(
    () =>
      [...(data?.allowed_ips ?? [])].sort((left, right) =>
        left.ip.localeCompare(right.ip, undefined, { numeric: true }),
      ),
    [data?.allowed_ips],
  );
  const currentIpAllowed = Boolean(
    currentIp && allowedIps.some((item) => item.ip.trim() === currentIp),
  );
  const otherIps = currentIp
    ? allowedIps.filter((item) => item.ip.trim() !== currentIp)
    : [];

  useEffect(() => {
    if (!visible) {
      setEditingDomainId(null);
      setPort("");
      return;
    }
    const ipDomain = data?.proxy_domains.find(
      (domain) => domain.target_port === 3101,
    )?.domain;
    if (!ipDomain) return;
    void getCurrentIp(ipDomain)
      .then(setCurrentIp)
      .catch(() => setCurrentIp(""));
  }, [data?.proxy_domains, visible]);

  const mutate = async (
    key: string,
    action: () => Promise<void>,
    failureTitle: string,
  ) => {
    setPendingKey(key);
    try {
      await action();
      const next = await getProjectDomains(projectId);
      onChange(next);
    } catch (mutationError) {
      Alert.alert(
        failureTitle,
        mutationError instanceof Error
          ? mutationError.message
          : "Please try again.",
      );
    } finally {
      setPendingKey(null);
    }
  };

  const addIp = (value: string) => {
    const normalized = value.trim();
    if (
      !/^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})(?:\.(?!$)|$)){4}$/.test(normalized)
    ) {
      Alert.alert(
        "Invalid IP address",
        "Enter an IPv4 address such as 203.0.113.10.",
      );
      return;
    }
    void mutate(
      "add-ip",
      async () => {
        await addProjectAllowedIp(projectId, normalized);
        setNewIp("");
      },
      "Could not add IP",
    );
  };

  const savePort = (domain: ProjectDomain) => {
    const nextPort = Number(port.trim());
    if (!Number.isInteger(nextPort) || nextPort < 1 || nextPort > 65535) {
      Alert.alert("Invalid port", "Enter a port from 1 through 65535.");
      return;
    }
    if (nextPort === domain.target_port) {
      setEditingDomainId(null);
      return;
    }
    void mutate(
      `domain:${domain.id}`,
      async () => {
        await updateProjectDomain(projectId, domain.id, {
          target_port: nextPort,
        });
        setEditingDomainId(null);
      },
      "Could not update port",
    );
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView
        edges={["top", "bottom"]}
        style={[styles.sheet, { backgroundColor: colors.background }]}
      >
        <View
          style={[styles.sheetHeader, { borderBottomColor: colors.border }]}
        >
          <View style={styles.sheetHeaderText}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              Project domains
            </Text>
            <Text
              style={[styles.sheetSubtitle, { color: colors.textSecondary }]}
            >
              Services, ports, and access
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close project domains"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.headerButton}
          >
            <AppIcon
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={19}
              tintColor={colors.textSecondary}
            />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void onReload()}
              tintColor={colors.brand}
              colors={[colors.brand]}
            />
          }
        >
          {isLoading && !data ? (
            <ActivityIndicator color={colors.brand} style={styles.loader} />
          ) : null}
          {error && !data ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void onReload()}
              style={[
                styles.errorCard,
                { backgroundColor: colors.destructiveSurface },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.destructive }]}>
                {error} Tap to retry.
              </Text>
            </Pressable>
          ) : null}

          {data ? (
            <>
              {currentIp && !currentIpAllowed ? (
                <View
                  style={[
                    styles.warningCard,
                    { backgroundColor: colors.warningSurface },
                  ]}
                >
                  <AppIcon
                    name={{
                      ios: "exclamationmark.triangle.fill",
                      android: "warning",
                      web: "warning",
                    }}
                    size={18}
                    tintColor={colors.warning}
                  />
                  <View style={styles.flex}>
                    <Text
                      style={[styles.warningTitle, { color: colors.warning }]}
                    >
                      Allow this device to connect
                    </Text>
                    <Text
                      style={[styles.warningCopy, { color: colors.warning }]}
                    >
                      Your IP {currentIp} is not in the allowlist.
                    </Text>
                  </View>
                  <Pressable
                    disabled={pendingKey !== null}
                    onPress={() => addIp(currentIp)}
                    style={[
                      styles.smallPrimary,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    {pendingKey === "add-ip" ? (
                      <ActivityIndicator
                        color={colors.primaryForeground}
                        size="small"
                      />
                    ) : (
                      <Text
                        style={[
                          styles.smallPrimaryText,
                          { color: colors.primaryForeground },
                        ]}
                      >
                        Allow
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : null}

              <SectionTitle
                colors={colors}
                count={domains.length}
                icon={{ ios: "globe", android: "public", web: "public" }}
                title="Available domains"
              />
              {domains.length === 0 ? (
                <EmptyCard
                  colors={colors}
                  text="No domains are configured for this project."
                />
              ) : (
                domains.map((domain) => {
                  const pending = pendingKey === `domain:${domain.id}`;
                  return (
                    <View
                      key={domain.id}
                      style={[
                        styles.domainCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="link"
                        onPress={() =>
                          void Linking.openURL(`https://${domain.domain}`)
                        }
                        style={({ pressed }) => [
                          styles.domainLink,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.domainIcon,
                            { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <AppIcon
                            name={{
                              ios: "globe",
                              android: "public",
                              web: "public",
                            }}
                            size={18}
                            tintColor={colors.text}
                          />
                        </View>
                        <View style={styles.flex}>
                          <Text
                            numberOfLines={1}
                            style={[styles.domainName, { color: colors.text }]}
                          >
                            {domain.domain}
                          </Text>
                          <Text
                            style={[
                              styles.domainKind,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {domain.is_editable
                              ? "Custom service route"
                              : "Platform-managed route"}
                          </Text>
                        </View>
                        <AppIcon
                          name={{
                            ios: "arrow.up.right.square",
                            android: "open_in_new",
                            web: "open_in_new",
                          }}
                          size={17}
                          tintColor={colors.textSecondary}
                        />
                      </Pressable>
                      <View style={styles.domainControls}>
                        {editingDomainId === domain.id ? (
                          <View style={styles.portEditor}>
                            <TextInput
                              autoFocus
                              editable={!pending}
                              keyboardType="number-pad"
                              onChangeText={setPort}
                              style={[
                                styles.portInput,
                                {
                                  backgroundColor: colors.input,
                                  borderColor: colors.border,
                                  color: colors.text,
                                },
                              ]}
                              value={port}
                            />
                            <Pressable
                              disabled={pending}
                              onPress={() => savePort(domain)}
                              style={[
                                styles.saveButton,
                                { backgroundColor: colors.primary },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.saveText,
                                  { color: colors.primaryForeground },
                                ]}
                              >
                                Save
                              </Text>
                            </Pressable>
                            <Pressable
                              disabled={pending}
                              onPress={() => setEditingDomainId(null)}
                              style={styles.compactIcon}
                            >
                              <AppIcon
                                name={{
                                  ios: "xmark",
                                  android: "close",
                                  web: "close",
                                }}
                                size={16}
                                tintColor={colors.textSecondary}
                              />
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            disabled={!domain.is_editable || pending}
                            onPress={() => {
                              setEditingDomainId(domain.id);
                              setPort(String(domain.target_port));
                            }}
                            style={[
                              styles.portButton,
                              { borderColor: colors.border },
                            ]}
                          >
                            <AppIcon
                              name={
                                domain.is_editable
                                  ? {
                                      ios: "pencil",
                                      android: "edit",
                                      web: "edit",
                                    }
                                  : {
                                      ios: "lock",
                                      android: "lock",
                                      web: "lock",
                                    }
                              }
                              size={14}
                              tintColor={colors.textSecondary}
                            />
                            <Text
                              style={[styles.portText, { color: colors.text }]}
                            >
                              Port {domain.target_port}
                            </Text>
                          </Pressable>
                        )}
                        <View style={styles.switchRow}>
                          <Text
                            style={[
                              styles.switchLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            All IPs
                          </Text>
                          {pending ? (
                            <ActivityIndicator
                              color={colors.brand}
                              size="small"
                            />
                          ) : (
                            <Switch
                              value={domain.allow_all_ips}
                              onValueChange={(value) =>
                                void mutate(
                                  `domain:${domain.id}`,
                                  () =>
                                    updateProjectDomain(projectId, domain.id, {
                                      allow_all_ips: value,
                                    }),
                                  "Could not update access",
                                )
                              }
                              trackColor={{
                                false: colors.border,
                                true: colors.success,
                              }}
                            />
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}

              <SectionTitle
                colors={colors}
                count={allowedIps.length}
                icon={{ ios: "network", android: "lan", web: "lan" }}
                title="Allowed IPs"
              />
              <Text style={[styles.currentIp, { color: colors.textSecondary }]}>
                Current IP:{" "}
                <Text style={{ color: colors.text }}>
                  {currentIp || "Unavailable"}
                </Text>
              </Text>
              <View style={styles.addIpRow}>
                <TextInput
                  editable={pendingKey === null}
                  keyboardType="numbers-and-punctuation"
                  onChangeText={setNewIp}
                  placeholder="203.0.113.10"
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.ipInput,
                    {
                      backgroundColor: colors.input,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={newIp}
                />
                <Pressable
                  disabled={!newIp.trim() || pendingKey !== null}
                  onPress={() => addIp(newIp)}
                  style={[
                    styles.addButton,
                    { backgroundColor: colors.primary },
                    (!newIp.trim() || pendingKey !== null) && styles.disabled,
                  ]}
                >
                  {pendingKey === "add-ip" ? (
                    <ActivityIndicator
                      color={colors.primaryForeground}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.addText,
                        { color: colors.primaryForeground },
                      ]}
                    >
                      Add IP
                    </Text>
                  )}
                </Pressable>
              </View>
              {allowedIps.length ? (
                <View style={[styles.ipCard, { borderColor: colors.border }]}>
                  <View style={styles.chips}>
                    {allowedIps.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.chip,
                          { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <Text style={[styles.chipText, { color: colors.text }]}>
                          {item.ip}
                        </Text>
                      </View>
                    ))}
                  </View>
                  {currentIpAllowed && otherIps.length ? (
                    <Pressable
                      disabled={pendingKey !== null}
                      onPress={() =>
                        Alert.alert(
                          "Remove other allowed IPs?",
                          `Remove ${otherIps.length} IP${otherIps.length === 1 ? "" : "s"} and keep ${currentIp}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Remove others",
                              style: "destructive",
                              onPress: () =>
                                void mutate(
                                  "remove-ips",
                                  () =>
                                    deleteProjectAllowedIps(
                                      projectId,
                                      otherIps.map((item) => item.id),
                                    ),
                                  "Could not remove IPs",
                                ),
                            },
                          ],
                        )
                      }
                      style={[
                        styles.removeButton,
                        { borderColor: colors.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.removeText,
                          { color: colors.destructive },
                        ]}
                      >
                        {pendingKey === "remove-ips"
                          ? "Removing…"
                          : "Remove others"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : (
                <EmptyCard
                  colors={colors}
                  text="No IP addresses have been added."
                />
              )}
              <Text style={[styles.footnote, { color: colors.textSecondary }]}>
                Access changes can take up to 30 seconds to take effect.
              </Text>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function SectionTitle({
  colors,
  count,
  icon,
  title,
}: {
  colors: AppColors;
  count: number;
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
}) {
  return (
    <View style={styles.sectionTitle}>
      <AppIcon name={icon} size={17} tintColor={colors.textSecondary} />
      <Text style={[styles.sectionText, { color: colors.text }]}>{title}</Text>
      <View style={[styles.count, { borderColor: colors.border }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {count}
        </Text>
      </View>
    </View>
  );
}

function EmptyCard({ colors, text }: { colors: AppColors; text: string }) {
  return (
    <View style={[styles.emptyCard, { borderColor: colors.border }]}>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    height: TouchTarget,
    justifyContent: "center",
    width: TouchTarget,
  },
  sheet: { flex: 1 },
  sheetHeader: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    minHeight: 64,
    paddingHorizontal: Spacing.four,
  },
  sheetHeaderText: { flex: 1 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  sheetSubtitle: { fontSize: 12, marginTop: 2 },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.eight,
  },
  loader: { marginVertical: Spacing.seven },
  errorCard: { borderRadius: Radius.medium, padding: Spacing.four },
  errorText: { fontSize: 13, lineHeight: 19, textAlign: "center" },
  warningCard: {
    alignItems: "center",
    borderRadius: Radius.medium,
    flexDirection: "row",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  warningTitle: { fontSize: 13, fontWeight: "700" },
  warningCopy: { fontSize: 12, marginTop: 3 },
  smallPrimary: {
    alignItems: "center",
    borderRadius: Radius.pill,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 64,
    paddingHorizontal: Spacing.three,
  },
  smallPrimaryText: { fontSize: 12, fontWeight: "700" },
  sectionTitle: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  sectionText: { flex: 1, fontSize: 14, fontWeight: "700" },
  count: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 28,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  countText: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  domainCard: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  domainLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: Spacing.three,
  },
  domainIcon: {
    alignItems: "center",
    borderRadius: Radius.small,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  domainName: { fontSize: 13, fontWeight: "700" },
  domainKind: { fontSize: 11, marginTop: 3 },
  domainControls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.three,
  },
  portButton: {
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 5,
    height: 36,
    paddingHorizontal: Spacing.three,
  },
  portText: { fontFamily: "monospace", fontSize: 12, fontWeight: "600" },
  portEditor: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: Spacing.two,
  },
  portInput: {
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: "monospace",
    height: 38,
    paddingHorizontal: Spacing.three,
    width: 82,
  },
  saveButton: {
    alignItems: "center",
    borderRadius: Radius.small,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  saveText: { fontSize: 12, fontWeight: "700" },
  compactIcon: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 34,
  },
  switchRow: { alignItems: "center", flexDirection: "row", gap: Spacing.two },
  switchLabel: { fontSize: 12, fontWeight: "600" },
  currentIp: { fontFamily: "monospace", fontSize: 12 },
  addIpRow: { flexDirection: "row", gap: Spacing.two },
  ipInput: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    fontFamily: "monospace",
    height: TouchTarget,
    paddingHorizontal: Spacing.three,
  },
  addButton: {
    alignItems: "center",
    borderRadius: Radius.medium,
    height: TouchTarget,
    justifyContent: "center",
    minWidth: 78,
    paddingHorizontal: Spacing.three,
  },
  addText: { fontSize: 13, fontWeight: "700" },
  ipCard: {
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  chip: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipText: { fontFamily: "monospace", fontSize: 12 },
  removeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  removeText: { fontSize: 12, fontWeight: "700" },
  emptyCard: {
    borderRadius: Radius.medium,
    borderStyle: "dashed",
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.four,
  },
  emptyText: { fontSize: 13, textAlign: "center" },
  footnote: { fontSize: 11, lineHeight: 16, marginTop: Spacing.two },
  flex: { flex: 1, minWidth: 0 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.55 },
});
