import { BlurTargetView } from "expo-blur";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Appearance,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { FloatingScreenHeader } from "@/components/floating-screen-header";
import { Radius, Spacing, TouchTarget, type AppColors } from "@/constants/theme";
import { useToast } from "@/contexts/toast-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useTheme } from "@/hooks/use-theme";

import {
  createSshKey,
  deleteSshKey,
  getConfigs,
  getSettings,
  getSshKeys,
  updateSettings,
  type ConfigType,
  type SshKey,
  type ThemePreference,
  type UserConfigSummary,
  type UserSettings,
} from "./settings-api";

const MIN_TERMINATION = 15;
const MAX_TERMINATION = 1200;

const themeOptions = [
  {
    description: "Bright and clear.",
    icon: { ios: "sun.max", android: "light_mode", web: "light_mode" } as const,
    label: "Light",
    value: "light",
  },
  {
    description: "Easy on the eyes.",
    icon: { ios: "moon", android: "dark_mode", web: "dark_mode" } as const,
    label: "Dark",
    value: "dark",
  },
  {
    description: "Match your device.",
    icon: { ios: "desktopcomputer", android: "devices", web: "devices" } as const,
    label: "System",
    value: "system",
  },
] as const;

const configTypes: Array<{ description: string; label: string; type: ConfigType }> = [
  { description: "Authentication and provider configuration.", label: "OpenCode", type: "opencode" },
  { description: "Codex authentication configuration.", label: "Codex", type: "codex" },
  { description: "Pi authentication configuration.", label: "Pi", type: "pi" },
];

type ModelForm = {
  defaultCommentModel: string;
  defaultIssueFixerModel: string;
  defaultModel: string;
  defaultPrModel: string;
};

type TerminationForm = {
  defaultIssueInstanceAutoTerminateAfterMinutes: string;
  defaultManualInstanceAutoTerminateAfterMinutes: string;
  defaultPrInstanceAutoTerminateAfterMinutes: string;
};

function Section({
  children,
  colors,
  description,
  icon,
  title,
}: {
  children: ReactNode;
  colors: AppColors;
  description: string;
  icon: Parameters<typeof AppIcon>[0]["name"];
  title: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.backgroundElement }]}>
          <AppIcon name={icon} size={19} tintColor={colors.textSecondary} />
        </View>
        <View style={styles.sectionHeadingText}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>{description}</Text>
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Field({
  colors,
  inputMode,
  label,
  onChangeText,
  placeholder,
  value,
}: {
  colors: AppColors;
  inputMode?: "numeric" | "text";
  label: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        autoCapitalize="none"
        inputMode={inputMode}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        selectionColor={colors.brand}
        style={[
          styles.input,
          { backgroundColor: colors.input, borderColor: colors.border, color: colors.text },
        ]}
        value={value}
      />
    </View>
  );
}

function SaveButton({
  colors,
  disabled,
  label,
  loading,
  onPress,
}: {
  colors: AppColors;
  disabled: boolean;
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.saveButton,
        { backgroundColor: colors.primary },
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primaryForeground} size="small" />
      ) : (
        <AppIcon
          name={{ ios: "checkmark", android: "check", web: "check" }}
          size={17}
          tintColor={colors.primaryForeground}
        />
      )}
      <Text style={[styles.saveText, { color: colors.primaryForeground }]}>{loading ? "Saving…" : label}</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const colors = useTheme();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { showToast } = useToast();
  const blurTargetRef = useRef<View>(null);
  const [themePreference, setThemePreference] = useState<ThemePreference>("system");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [configs, setConfigs] = useState<UserConfigSummary[]>([]);
  const [sshKeys, setSshKeys] = useState<SshKey[]>([]);
  const [telegramChatId, setTelegramChatId] = useState("");
  const [models, setModels] = useState<ModelForm>({
    defaultCommentModel: "",
    defaultIssueFixerModel: "",
    defaultModel: "",
    defaultPrModel: "",
  });
  const [termination, setTermination] = useState<TerminationForm>({
    defaultIssueInstanceAutoTerminateAfterMinutes: "",
    defaultManualInstanceAutoTerminateAfterMinutes: "",
    defaultPrInstanceAutoTerminateAfterMinutes: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"models" | "telegram" | "termination" | null>(null);
  const [isSshModalOpen, setIsSshModalOpen] = useState(false);

  const hydrate = useCallback((next: UserSettings) => {
    setSettings(next);
    setTelegramChatId(next.telegram_chat_id?.toString() ?? "");
    setModels({
      defaultCommentModel: next.default_comment_model ?? "",
      defaultIssueFixerModel: next.default_issue_fixer_model ?? "",
      defaultModel: next.default_model ?? "",
      defaultPrModel: next.default_pr_model ?? "",
    });
    setTermination({
      defaultIssueInstanceAutoTerminateAfterMinutes: next.default_issue_instance_auto_terminate_after_minutes.toString(),
      defaultManualInstanceAutoTerminateAfterMinutes: next.default_manual_instance_auto_terminate_after_minutes.toString(),
      defaultPrInstanceAutoTerminateAfterMinutes: next.default_pr_instance_auto_terminate_after_minutes.toString(),
    });
  }, []);

  const load = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [nextSettings, nextConfigs, nextSshKeys] = await Promise.all([
        getSettings(signal),
        getConfigs(signal),
        getSshKeys(signal),
      ]);
      hydrate(nextSettings);
      setConfigs(nextConfigs);
      setSshKeys(nextSshKeys);
    } catch (error) {
      if (signal?.aborted) return;
      setLoadError(error instanceof Error ? error.message : "Could not load settings.");
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const chooseTheme = (preference: ThemePreference) => {
    setThemePreference(preference);
    Appearance.setColorScheme(preference === "system" ? "unspecified" : preference);
  };

  const save = async (
    kind: "models" | "telegram" | "termination",
    payload: Parameters<typeof updateSettings>[0],
    successMessage: string,
  ) => {
    setSaving(kind);
    try {
      const next = await updateSettings(payload);
      hydrate(next);
      showToast({ message: successMessage, title: "Saved", variant: "success" });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Try again.",
        title: "Could not save",
        variant: "error",
      });
    } finally {
      setSaving(null);
    }
  };

  const saveTelegram = () => {
    const trimmed = telegramChatId.trim();
    const value = trimmed ? Number(trimmed) : null;
    if (value !== null && !Number.isSafeInteger(value)) {
      showToast({
        message: "Telegram chat ID must be a whole number.",
        title: "Invalid chat ID",
        variant: "error",
      });
      return;
    }
    void save("telegram", { telegramChatId: value }, "Telegram chat ID updated.");
  };

  const saveTermination = () => {
    const values = Object.fromEntries(
      Object.entries(termination).map(([key, value]) => [key, Number(value)]),
    ) as unknown as {
      defaultIssueInstanceAutoTerminateAfterMinutes: number;
      defaultManualInstanceAutoTerminateAfterMinutes: number;
      defaultPrInstanceAutoTerminateAfterMinutes: number;
    };
    if (Object.values(values).some((value) => !Number.isInteger(value) || value < MIN_TERMINATION || value > MAX_TERMINATION)) {
      showToast({
        message: "Use whole minutes from 15 to 1200.",
        title: "Invalid duration",
        variant: "error",
      });
      return;
    }
    void save("termination", values, "Auto-termination settings updated.");
  };

  const confirmDeleteSshKey = (key: SshKey) => {
    Alert.alert("Delete SSH key?", `Remove ${key.name} from your account?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteSshKey(key.id)
            .then(() => {
              setSshKeys((current) => current.filter((item) => item.id !== key.id));
              showToast({
                message: `${key.name} was removed from your account.`,
                title: "SSH key deleted",
                variant: "success",
              });
            })
            .catch((error) => {
              showToast({
                message: error instanceof Error ? error.message : "Try again.",
                title: "Could not delete key",
                variant: "error",
              });
            });
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
        <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
          {isLoading ? (
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.brand} size="large" />
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>Loading your settings…</Text>
            </View>
          ) : loadError ? (
            <View style={styles.centerState}>
              <AppIcon
                name={{ ios: "exclamationmark.triangle", android: "warning", web: "warning" }}
                size={28}
                tintColor={colors.destructive}
              />
              <Text style={[styles.stateTitle, { color: colors.text }]}>Could not load settings</Text>
              <Text style={[styles.stateText, { color: colors.textSecondary }]}>{loadError}</Text>
              <SaveButton colors={colors} disabled={false} label="Try again" loading={false} onPress={() => void load()} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Section
              colors={colors}
              description="Choose how AI Playground looks on this device."
              icon={{ ios: "sun.max", android: "palette", web: "palette" }}
              title="Appearance"
            >
              <View style={styles.themeGrid}>
                {themeOptions.map((option) => {
                  const selected = themePreference === option.value;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      key={option.value}
                      onPress={() => chooseTheme(option.value)}
                      style={({ pressed }) => [
                        styles.themeOption,
                        {
                          backgroundColor: selected ? colors.backgroundSelected : colors.surface,
                          borderColor: selected ? colors.text : colors.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={[styles.themeIcon, { backgroundColor: colors.backgroundElement }]}>
                        <AppIcon name={option.icon} size={18} tintColor={colors.text} />
                      </View>
                      <View style={styles.themeText}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{option.label}</Text>
                        <Text numberOfLines={1} style={[styles.rowDescription, { color: colors.textSecondary }]}>{option.description}</Text>
                      </View>
                      {selected ? (
                        <AppIcon name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={19} tintColor={colors.brand} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Section>

            <Section
              colors={colors}
              description="Encrypted authentication settings for your coding tools."
              icon={{ ios: "terminal", android: "smart_toy", web: "smart_toy" }}
              title="Tool configurations"
            >
              <View style={styles.rows}>
                {configTypes.map((config, index) => {
                  const configured = configs.some((item) => item.config_type === config.type);
                  return (
                    <View key={config.type} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                      <View style={styles.rowText}>
                        <Text style={[styles.rowTitle, { color: colors.text }]}>{config.label}</Text>
                        <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>{config.description}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: configured ? colors.successSurface : colors.backgroundElement }]}>
                        <Text style={[styles.statusText, { color: configured ? colors.success : colors.textSecondary }]}>{configured ? "Configured" : "Not set"}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </Section>

            <Section colors={colors} description="Chat ID used for bot notifications." icon={{ ios: "paperplane", android: "send", web: "send" }} title="Telegram">
              <Field colors={colors} inputMode="numeric" label="Telegram chat ID" onChangeText={setTelegramChatId} placeholder="e.g. -1001234567890" value={telegramChatId} />
              <View style={styles.actionRow}>
                <SaveButton colors={colors} disabled={saving !== null} label="Save Telegram" loading={saving === "telegram"} onPress={saveTelegram} />
              </View>
            </Section>

            <Section colors={colors} description="Models used when a workflow does not specify one." icon={{ ios: "gearshape.2", android: "tune", web: "tune" }} title="Default models">
              <View style={styles.fields}>
                <Field colors={colors} label="Default model" onChangeText={(value) => setModels((current) => ({ ...current, defaultModel: value }))} value={models.defaultModel} />
                <Field colors={colors} label="Pull request model" onChangeText={(value) => setModels((current) => ({ ...current, defaultPrModel: value }))} value={models.defaultPrModel} />
                <Field colors={colors} label="Issue fixer model" onChangeText={(value) => setModels((current) => ({ ...current, defaultIssueFixerModel: value }))} value={models.defaultIssueFixerModel} />
                <Field colors={colors} label="Comment model" onChangeText={(value) => setModels((current) => ({ ...current, defaultCommentModel: value }))} value={models.defaultCommentModel} />
              </View>
              <View style={styles.actionRow}>
                <SaveButton
                  colors={colors}
                  disabled={saving !== null}
                  label="Save models"
                  loading={saving === "models"}
                  onPress={() => void save("models", {
                    defaultCommentModel: models.defaultCommentModel || null,
                    defaultIssueFixerModel: models.defaultIssueFixerModel || null,
                    defaultModel: models.defaultModel || null,
                    defaultPrModel: models.defaultPrModel || null,
                  }, "Default models updated.")}
                />
              </View>
            </Section>

            <Section colors={colors} description="Stop idle runtimes automatically. Values are in minutes (15–1200)." icon={{ ios: "timer", android: "timer", web: "timer" }} title="Instance auto-termination">
              <View style={styles.fields}>
                <Field colors={colors} inputMode="numeric" label="Manual instances" onChangeText={(value) => setTermination((current) => ({ ...current, defaultManualInstanceAutoTerminateAfterMinutes: value }))} value={termination.defaultManualInstanceAutoTerminateAfterMinutes} />
                <Field colors={colors} inputMode="numeric" label="Issue instances" onChangeText={(value) => setTermination((current) => ({ ...current, defaultIssueInstanceAutoTerminateAfterMinutes: value }))} value={termination.defaultIssueInstanceAutoTerminateAfterMinutes} />
                <Field colors={colors} inputMode="numeric" label="Pull request instances" onChangeText={(value) => setTermination((current) => ({ ...current, defaultPrInstanceAutoTerminateAfterMinutes: value }))} value={termination.defaultPrInstanceAutoTerminateAfterMinutes} />
              </View>
              <View style={styles.actionRow}>
                <SaveButton colors={colors} disabled={saving !== null} label="Save auto-termination" loading={saving === "termination"} onPress={saveTermination} />
              </View>
            </Section>

            <Section colors={colors} description="Public keys allowed to connect to your workspaces." icon={{ ios: "key", android: "key", web: "key" }} title="SSH keys">
              <View style={styles.sshHeader}>
                <Text style={[styles.sshCount, { color: colors.textSecondary }]}>{sshKeys.length ? `${sshKeys.length} configured` : "No keys configured"}</Text>
                <Pressable accessibilityRole="button" onPress={() => setIsSshModalOpen(true)} style={({ pressed }) => [styles.outlineButton, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <AppIcon name={{ ios: "plus", android: "add", web: "add" }} size={17} tintColor={colors.text} />
                  <Text style={[styles.outlineButtonText, { color: colors.text }]}>Add key</Text>
                </Pressable>
              </View>
              {sshKeys.map((key, index) => (
                <View key={key.id} style={[styles.sshRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                  <View style={[styles.sshIcon, { backgroundColor: colors.backgroundElement }]}>
                    <AppIcon name={{ ios: "key", android: "key", web: "key" }} size={17} tintColor={colors.textSecondary} />
                  </View>
                  <Text numberOfLines={1} style={[styles.sshName, { color: colors.text }]}>{key.name}</Text>
                  <Pressable accessibilityLabel={`Delete ${key.name}`} accessibilityRole="button" hitSlop={8} onPress={() => confirmDeleteSshKey(key)} style={({ pressed }) => [styles.rowIconButton, pressed && styles.pressed]}>
                    <AppIcon name={{ ios: "trash", android: "delete", web: "delete" }} size={18} tintColor={colors.destructive} />
                  </Pressable>
                </View>
              ))}
            </Section>
            </ScrollView>
          )}
        </BlurTargetView>

        <FloatingScreenHeader
          blurTarget={blurTargetRef}
          colors={colors}
          colorScheme={colorScheme}
          onBack={() => router.back()}
          title="Settings"
        />
      </SafeAreaView>

      <SshKeyModal colors={colors} onClose={() => setIsSshModalOpen(false)} onCreated={() => { setIsSshModalOpen(false); void getSshKeys().then(setSshKeys); }} visible={isSshModalOpen} />
    </View>
  );
}

function SshKeyModal({ colors, onClose, onCreated, visible }: { colors: AppColors; onClose: () => void; onCreated: () => void; visible: boolean }) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || !value.trim()) {
      showToast({
        message: "Enter a name and public key.",
        title: "Missing information",
        variant: "error",
      });
      return;
    }
    setSaving(true);
    try {
      await createSshKey({ name: name.trim(), value: value.trim() });
      setName("");
      setValue("");
      onCreated();
      showToast({
        message: "The key can now be used to access your workspaces.",
        title: "SSH key added",
        variant: "success",
      });
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : "Try again.",
        title: "Could not add key",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <SafeAreaView edges={["bottom"]} style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add SSH key</Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>Allow secure workspace access.</Text>
            </View>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" onPress={onClose} style={styles.rowIconButton}>
              <AppIcon name={{ ios: "xmark", android: "close", web: "close" }} size={20} tintColor={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.fields}>
            <Field colors={colors} label="Name" onChangeText={setName} placeholder="My laptop" value={name} />
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Public key</Text>
              <TextInput autoCapitalize="none" multiline onChangeText={setValue} placeholder="ssh-ed25519 AAAA…" placeholderTextColor={colors.textSecondary} style={[styles.keyInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.text }]} value={value} />
            </View>
          </View>
          <View style={styles.actionRow}>
            <SaveButton colors={colors} disabled={saving} label="Add key" loading={saving} onPress={() => void submit()} />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  blurTarget: { flex: 1 },
  content: { gap: Spacing.ten, paddingBottom: Spacing.ten, paddingHorizontal: Spacing.five, paddingTop: Spacing.ten },
  section: { width: "100%" },
  sectionHeading: { alignItems: "flex-start", flexDirection: "row", gap: Spacing.three },
  sectionIcon: { alignItems: "center", borderRadius: Radius.small, height: 38, justifyContent: "center", width: 38 },
  sectionHeadingText: { flex: 1, paddingTop: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionDescription: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  sectionBody: { marginTop: Spacing.five },
  themeGrid: { gap: Spacing.three },
  themeOption: { alignItems: "center", borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", minHeight: 66, paddingHorizontal: Spacing.three },
  themeIcon: { alignItems: "center", borderRadius: Radius.small, height: 38, justifyContent: "center", width: 38 },
  themeText: { flex: 1, marginHorizontal: Spacing.three },
  rows: { width: "100%" },
  dataRow: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: 72, paddingVertical: Spacing.three },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowDescription: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  statusPill: { borderRadius: Radius.pill, paddingHorizontal: Spacing.three, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  fields: { gap: Spacing.four },
  field: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "600" },
  input: { borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, fontSize: 14, height: 48, paddingHorizontal: Spacing.four },
  keyInput: { borderRadius: Radius.medium, borderWidth: StyleSheet.hairlineWidth, fontSize: 13, height: 108, padding: Spacing.four, textAlignVertical: "top" },
  actionRow: { alignItems: "flex-end", marginTop: Spacing.four },
  saveButton: { alignItems: "center", borderRadius: Radius.pill, flexDirection: "row", gap: Spacing.two, minHeight: TouchTarget, paddingHorizontal: Spacing.five },
  saveText: { fontSize: 12, fontWeight: "700" },
  outlineButton: { alignItems: "center", borderRadius: Radius.pill, borderWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: Spacing.three },
  outlineButtonText: { fontSize: 12, fontWeight: "700" },
  sshHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.two },
  sshCount: { fontSize: 11 },
  sshRow: { alignItems: "center", flexDirection: "row", gap: Spacing.three, minHeight: 62 },
  sshIcon: { alignItems: "center", borderRadius: Radius.small, height: 36, justifyContent: "center", width: 36 },
  sshName: { flex: 1, fontSize: 13, fontWeight: "600" },
  rowIconButton: { alignItems: "center", height: TouchTarget, justifyContent: "center", width: TouchTarget },
  centerState: { alignItems: "center", flex: 1, justifyContent: "center", paddingHorizontal: Spacing.seven },
  stateTitle: { fontSize: 17, fontWeight: "700", marginTop: Spacing.four },
  stateText: { fontSize: 12, lineHeight: 19, marginBottom: Spacing.four, marginTop: Spacing.three, textAlign: "center" },
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalSheet: { borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, paddingBottom: Spacing.five, paddingHorizontal: Spacing.five },
  modalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: Spacing.five, paddingTop: Spacing.five },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.6 },
});
