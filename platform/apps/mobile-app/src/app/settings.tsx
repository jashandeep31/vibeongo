import type { UserConfigValue } from "@repo/api-client";
import {
  useCreateSshKey,
  useCreateUserConfig,
  useDeleteSshKey,
  useSshKeys,
  useUpdateSshKey,
  useUpdateUserConfig,
  useUpdateUserSettings,
  useUserConfig,
  useUserConfigs,
  useUserSettings,
} from "@repo/api-hooks";
import { useQueryClient } from "@repo/api-hooks";
import { useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { BottomDrawerPanel } from "@/components/bottom-drawer-panel";
import { ConfirmationDrawer } from "@/components/confirmation-drawer";
import { PageChromeLayout, PageHeader } from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  type ThemePreference,
  useThemePreference,
} from "@/providers/theme-preference-provider";

const AUTO_TERMINATE_MIN_MINUTES = 15;
const AUTO_TERMINATE_MAX_MINUTES = 1200;

function showSettingsError(text1: string, text2?: string) {
  Toast.show({ type: "error", text1, text2 });
}

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: SymbolViewProps["name"];
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright and clear.",
    icon: { ios: "sun.max", android: "light_mode" },
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes.",
    icon: { ios: "moon", android: "dark_mode" },
  },
  {
    value: "system",
    label: "System",
    description: "Match your device.",
    icon: { ios: "desktopcomputer", android: "devices" },
  },
];

const configTypes = [
  {
    type: "opencode",
    name: "OpenCode",
    description: "Authentication and provider configuration.",
  },
  {
    type: "codex",
    name: "Codex",
    description: "Codex authentication configuration.",
  },
  {
    type: "pi",
    name: "Pi",
    description: "Pi authentication configuration.",
  },
] as const;

type ConfigType = (typeof configTypes)[number]["type"];
type SshKey = NonNullable<ReturnType<typeof useSshKeys>["data"]>[number];

const modelRows = [
  { label: "Default model", name: "defaultModel" },
  { label: "Pull request model", name: "defaultPrModel" },
  { label: "Issue fixer model", name: "defaultIssueFixerModel" },
  { label: "Comment model", name: "defaultCommentModel" },
] as const;

const terminationRows = [
  {
    label: "Manual instances",
    name: "defaultManualInstanceAutoTerminateAfterMinutes",
  },
  {
    label: "Issue instances",
    name: "defaultIssueInstanceAutoTerminateAfterMinutes",
  },
  {
    label: "Pull request instances",
    name: "defaultPrInstanceAutoTerminateAfterMinutes",
  },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { preference, setPreference } = useThemePreference();
  const settingsQuery = useUserSettings();
  const configsQuery = useUserConfigs();
  const sshKeysQuery = useSshKeys();
  const updateTelegramSettings = useUpdateUserSettings();
  const updateModelSettings = useUpdateUserSettings();
  const updateTerminationSettings = useUpdateUserSettings();
  const deleteSshKey = useDeleteSshKey();
  const userSettings = settingsQuery.data;
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isTelegramDirty, setIsTelegramDirty] = useState(false);
  const [modelForm, setModelForm] = useState({
    defaultPrModel: "",
    defaultIssueFixerModel: "",
    defaultCommentModel: "",
    defaultModel: "",
  });
  const [isModelFormDirty, setIsModelFormDirty] = useState(false);
  const [terminationForm, setTerminationForm] = useState({
    defaultIssueInstanceAutoTerminateAfterMinutes: "",
    defaultPrInstanceAutoTerminateAfterMinutes: "",
    defaultManualInstanceAutoTerminateAfterMinutes: "",
  });
  const [isTerminationFormDirty, setIsTerminationFormDirty] = useState(false);
  const [configEditor, setConfigEditor] = useState<{
    type: ConfigType;
    name: string;
    configured: boolean;
  } | null>(null);
  const [sshEditor, setSshEditor] = useState<SshKey | "new" | null>(null);
  const [sshKeyToDelete, setSshKeyToDelete] = useState<SshKey | null>(null);

  useEffect(() => {
    if (!userSettings || isTelegramDirty) return;
    setTelegramChatId(userSettings.telegram_chat_id?.toString() ?? "");
  }, [isTelegramDirty, userSettings]);

  useEffect(() => {
    if (!userSettings || isModelFormDirty) return;
    setModelForm({
      defaultPrModel: userSettings.default_pr_model ?? "",
      defaultIssueFixerModel: userSettings.default_issue_fixer_model ?? "",
      defaultCommentModel: userSettings.default_comment_model ?? "",
      defaultModel: userSettings.default_model ?? "",
    });
  }, [isModelFormDirty, userSettings]);

  useEffect(() => {
    if (!userSettings || isTerminationFormDirty) return;
    setTerminationForm({
      defaultIssueInstanceAutoTerminateAfterMinutes:
        userSettings.default_issue_instance_auto_terminate_after_minutes.toString(),
      defaultPrInstanceAutoTerminateAfterMinutes:
        userSettings.default_pr_instance_auto_terminate_after_minutes.toString(),
      defaultManualInstanceAutoTerminateAfterMinutes:
        userSettings.default_manual_instance_auto_terminate_after_minutes.toString(),
    });
  }, [isTerminationFormDirty, userSettings]);

  const saveTelegram = async () => {
    const parsedChatId = telegramChatId.trim() ? Number(telegramChatId) : null;
    if (parsedChatId !== null && !Number.isSafeInteger(parsedChatId)) {
      showSettingsError(
        "Invalid Telegram chat ID",
        "Telegram chat ID must be a whole number.",
      );
      return;
    }
    try {
      await updateTelegramSettings.mutateAsync({
        telegramChatId: parsedChatId,
      });
      setIsTelegramDirty(false);
    } catch {
      showSettingsError("Could not save Telegram chat ID", "Please try again.");
    }
  };

  const saveModels = async () => {
    try {
      await updateModelSettings.mutateAsync(modelForm);
      setIsModelFormDirty(false);
    } catch {
      showSettingsError("Could not save default models", "Please try again.");
    }
  };

  const saveTermination = async () => {
    const values = {
      defaultIssueInstanceAutoTerminateAfterMinutes: Number(
        terminationForm.defaultIssueInstanceAutoTerminateAfterMinutes,
      ),
      defaultPrInstanceAutoTerminateAfterMinutes: Number(
        terminationForm.defaultPrInstanceAutoTerminateAfterMinutes,
      ),
      defaultManualInstanceAutoTerminateAfterMinutes: Number(
        terminationForm.defaultManualInstanceAutoTerminateAfterMinutes,
      ),
    };
    if (
      Object.values(values).some(
        (value) =>
          !Number.isInteger(value) ||
          value < AUTO_TERMINATE_MIN_MINUTES ||
          value > AUTO_TERMINATE_MAX_MINUTES,
      )
    ) {
      showSettingsError(
        "Invalid duration",
        "Use whole minutes from 15 to 1200.",
      );
      return;
    }
    try {
      await updateTerminationSettings.mutateAsync(values);
      setIsTerminationFormDirty(false);
    } catch {
      showSettingsError(
        "Could not save auto-termination settings",
        "Please try again.",
      );
    }
  };

  const confirmDeleteSshKey = async () => {
    if (!sshKeyToDelete || deleteSshKey.isPending) return;
    try {
      await deleteSshKey.mutateAsync(sshKeyToDelete.id);
      setSshKeyToDelete(null);
    } catch {
      showSettingsError("Could not delete SSH key", "Please try again.");
    }
  };

  const refresh = () => {
    void Promise.all([
      settingsQuery.refetch(),
      configsQuery.refetch(),
      sshKeysQuery.refetch(),
    ]);
  };

  const isRefreshing =
    settingsQuery.isRefetching ||
    configsQuery.isRefetching ||
    sshKeysQuery.isRefetching;

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <PageChromeLayout top={<ScreenHeader onBack={() => router.back()} />}>
        {({ topInset }) => (
          <ScrollView
            contentContainerStyle={[styles.content, { paddingTop: topInset }]}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                onRefresh={refresh}
                refreshing={isRefreshing}
                tintColor={theme.textSecondary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <SettingsSection
              icon={{ ios: "sun.max", android: "light_mode" }}
              title="Appearance"
            >
              <View style={styles.optionList}>
                {themeOptions.map((option) => {
                  const selected = preference === option.value;
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={option.value}
                      onPress={() => void setPreference(option.value)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: theme.backgroundElement,
                          borderColor: selected
                            ? theme.text
                            : theme.backgroundSelected,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        name={option.icon}
                        size={20}
                        tintColor={theme.text}
                      />
                      <View style={styles.optionCopy}>
                        <ThemedText style={styles.optionTitle}>
                          {option.label}
                        </ThemedText>
                        <ThemedText
                          style={styles.optionDescription}
                          themeColor="textSecondary"
                        >
                          {option.description}
                        </ThemedText>
                      </View>
                      {selected ? (
                        <SymbolView
                          name={{ ios: "checkmark", android: "check" }}
                          size={18}
                          tintColor={theme.text}
                          weight="semibold"
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </SettingsSection>

            <SettingsSection
              icon={{ ios: "cpu", android: "smart_toy" }}
              title="Tool configurations"
            >
              {configTypes.map((config) => {
                const configured = (configsQuery.data ?? []).some(
                  (item) => item.config_type === config.type,
                );
                return (
                  <SettingsRow key={config.type} last={config.type === "pi"}>
                    <View style={styles.rowCopy}>
                      <ThemedText style={styles.rowTitle}>
                        {config.name}
                      </ThemedText>
                      <ThemedText
                        style={styles.rowDescription}
                        themeColor="textSecondary"
                      >
                        {config.description}
                      </ThemedText>
                    </View>
                    {configsQuery.isPending ? (
                      <ActivityIndicator
                        color={theme.textSecondary}
                        size="small"
                      />
                    ) : configsQuery.isError ? (
                      <ThemedText style={styles.inlineError}>
                        Load failed
                      </ThemedText>
                    ) : (
                      <SmallButton
                        label={configured ? "Edit" : "Configure"}
                        onPress={() =>
                          setConfigEditor({
                            type: config.type,
                            name: config.name,
                            configured,
                          })
                        }
                      />
                    )}
                  </SettingsRow>
                );
              })}
            </SettingsSection>

            <SettingsSection
              icon={{ ios: "paperplane", android: "send" }}
              title="Telegram"
            >
              <ServerSettingsState query={settingsQuery}>
                <SettingsTextInput
                  editable={
                    Boolean(userSettings) && !updateTelegramSettings.isPending
                  }
                  keyboardType="numbers-and-punctuation"
                  onChangeText={(value) => {
                    if (/^-?\d*$/.test(value)) {
                      setTelegramChatId(value);
                      setIsTelegramDirty(true);
                    }
                  }}
                  placeholder="e.g. -1001234567890"
                  value={telegramChatId}
                />
                <SaveButton
                  disabled={!userSettings || !isTelegramDirty}
                  label="Save Telegram"
                  onPress={() => void saveTelegram()}
                  pending={updateTelegramSettings.isPending}
                />
              </ServerSettingsState>
            </SettingsSection>

            <SettingsSection
              icon={{ ios: "slider.horizontal.3", android: "tune" }}
              title="Default models"
            >
              <ServerSettingsState query={settingsQuery}>
                <View style={styles.formFields}>
                  {modelRows.map((row) => (
                    <LabeledInput
                      editable={
                        Boolean(userSettings) && !updateModelSettings.isPending
                      }
                      key={row.name}
                      label={row.label}
                      onChangeText={(value) => {
                        setModelForm((current) => ({
                          ...current,
                          [row.name]: value,
                        }));
                        setIsModelFormDirty(true);
                      }}
                      value={modelForm[row.name]}
                    />
                  ))}
                </View>
                <SaveButton
                  disabled={!userSettings || !isModelFormDirty}
                  label="Save models"
                  onPress={() => void saveModels()}
                  pending={updateModelSettings.isPending}
                />
              </ServerSettingsState>
            </SettingsSection>

            <SettingsSection
              description="Whole minutes from 15 to 1200."
              icon={{ ios: "timer", android: "timer" }}
              title="Instance auto-termination"
            >
              <ServerSettingsState query={settingsQuery}>
                <View style={styles.formFields}>
                  {terminationRows.map((row) => (
                    <LabeledInput
                      editable={
                        Boolean(userSettings) &&
                        !updateTerminationSettings.isPending
                      }
                      key={row.name}
                      keyboardType="number-pad"
                      label={row.label}
                      onChangeText={(value) => {
                        if (!/^\d*$/.test(value)) return;
                        setTerminationForm((current) => ({
                          ...current,
                          [row.name]: value,
                        }));
                        setIsTerminationFormDirty(true);
                      }}
                      value={terminationForm[row.name]}
                    />
                  ))}
                </View>
                <SaveButton
                  disabled={!userSettings || !isTerminationFormDirty}
                  label="Save auto-termination"
                  onPress={() => void saveTermination()}
                  pending={updateTerminationSettings.isPending}
                />
              </ServerSettingsState>
            </SettingsSection>

            <SettingsSection
              action={
                <SmallButton
                  label="Add key"
                  onPress={() => setSshEditor("new")}
                />
              }
              icon={{ ios: "key", android: "key" }}
              title="SSH keys"
            >
              {sshKeysQuery.isPending ? (
                <LoadingBlocks />
              ) : sshKeysQuery.isError ? (
                <InlineError
                  label="Failed to load SSH keys."
                  onRetry={() => void sshKeysQuery.refetch()}
                />
              ) : sshKeysQuery.data?.length ? (
                sshKeysQuery.data.map((sshKey, index) => (
                  <SettingsRow
                    key={sshKey.id}
                    last={index === sshKeysQuery.data.length - 1}
                  >
                    <View style={styles.keyIcon}>
                      <SymbolView
                        name={{ ios: "key", android: "key" }}
                        size={18}
                        tintColor={theme.textSecondary}
                      />
                    </View>
                    <ThemedText numberOfLines={1} style={styles.keyName}>
                      {sshKey.name}
                    </ThemedText>
                    <IconButton
                      accessibilityLabel={`Edit ${sshKey.name}`}
                      icon={{ ios: "pencil", android: "edit" }}
                      onPress={() => setSshEditor(sshKey)}
                    />
                    <IconButton
                      accessibilityLabel={`Delete ${sshKey.name}`}
                      destructive
                      disabled={deleteSshKey.isPending}
                      icon={{ ios: "trash", android: "delete" }}
                      onPress={() => setSshKeyToDelete(sshKey)}
                    />
                  </SettingsRow>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <SymbolView
                    name={{ ios: "key", android: "key" }}
                    size={28}
                    tintColor={theme.textSecondary}
                  />
                  <ThemedText themeColor="textSecondary">
                    No SSH keys configured.
                  </ThemedText>
                </View>
              )}
            </SettingsSection>
          </ScrollView>
        )}
      </PageChromeLayout>

      <UserConfigDrawer
        editor={configEditor}
        onClose={() => setConfigEditor(null)}
      />
      <SshKeyDrawer editor={sshEditor} onClose={() => setSshEditor(null)} />
      <ConfirmationDrawer
        confirmLabel="Delete"
        description={`Remove ${sshKeyToDelete?.name ?? "this key"} from your account. This cannot be undone.`}
        isConfirming={deleteSshKey.isPending}
        onCancel={() => setSshKeyToDelete(null)}
        onConfirm={() => void confirmDeleteSshKey()}
        title="Delete SSH key?"
        visible={Boolean(sshKeyToDelete)}
      />
    </SafeAreaView>
  );
}

function ScreenHeader({ onBack }: { onBack: () => void }) {
  return <PageHeader onBack={onBack} title="Settings" />;
}

function SettingsSection({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string;
  description?: string;
  icon: SymbolViewProps["name"];
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.section, { borderBottomColor: theme.backgroundSelected }]}
    >
      <View style={styles.sectionHeader}>
        <SymbolView name={icon} size={19} tintColor={theme.textSecondary} />
        <View style={styles.sectionCopy}>
          <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
          {description ? (
            <ThemedText
              style={styles.sectionDescription}
              themeColor="textSecondary"
            >
              {description}
            </ThemedText>
          ) : null}
        </View>
        {action}
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingsRow({
  children,
  last = false,
}: {
  children: ReactNode;
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.settingsRow,
        !last && {
          borderBottomColor: theme.backgroundSelected,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {children}
    </View>
  );
}

function SettingsTextInput(props: React.ComponentProps<typeof TextInput>) {
  const theme = useTheme();
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.textSecondary}
      style={[
        styles.input,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.backgroundSelected,
          color: theme.text,
        },
        props.style,
      ]}
    />
  );
}

function LabeledInput({
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.labeledInput}>
      <ThemedText style={styles.inputLabel} themeColor="textSecondary">
        {label}
      </ThemedText>
      <SettingsTextInput {...props} />
    </View>
  );
}

function SaveButton({
  label,
  disabled,
  pending,
  onPress,
}: {
  label: string;
  disabled: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const inactive = disabled || pending;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.saveButton,
        { backgroundColor: theme.text },
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {pending ? (
        <ActivityIndicator color={theme.background} size="small" />
      ) : (
        <SymbolView
          name={{ ios: "square.and.arrow.down", android: "save" }}
          size={17}
          tintColor={theme.background}
        />
      )}
      <ThemedText style={[styles.saveLabel, { color: theme.background }]}>
        {pending ? "Saving..." : label}
      </ThemedText>
    </Pressable>
  );
}

function SmallButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        { borderColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={styles.smallButtonLabel}>{label}</ThemedText>
    </Pressable>
  );
}

function IconButton({
  accessibilityLabel,
  icon,
  onPress,
  destructive = false,
  disabled = false,
}: {
  accessibilityLabel: string;
  icon: SymbolViewProps["name"];
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <SymbolView
        name={icon}
        size={18}
        tintColor={destructive ? "#ef4444" : theme.textSecondary}
      />
    </Pressable>
  );
}

function UserConfigDrawer({
  editor,
  onClose,
}: {
  editor: { type: ConfigType; name: string; configured: boolean } | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const configQuery = useUserConfig(
    editor?.type ?? "opencode",
    Boolean(editor),
  );
  const createMutation = useCreateUserConfig();
  const updateMutation = useUpdateUserConfig();
  const [configText, setConfigText] = useState("{}");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!editor || !configQuery.isSuccess) return;
    setConfigText(JSON.stringify(configQuery.data?.config ?? {}, null, 2));
  }, [configQuery.data, configQuery.isSuccess, editor]);

  const close = () => {
    if (isSaving) return;
    finishClose();
  };

  const finishClose = () => {
    if (editor) {
      queryClient.removeQueries({
        queryKey: ["user-config", editor.type],
        exact: true,
      });
    }
    setConfigText("{}");
    setValidationError(null);
    onClose();
  };

  const save = async () => {
    if (!editor) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(configText);
    } catch {
      setValidationError("Enter valid JSON before saving.");
      return;
    }
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      setValidationError("The configuration must be a JSON object.");
      return;
    }
    setValidationError(null);
    try {
      const config = parsed as UserConfigValue;
      if (editor.configured) {
        await updateMutation.mutateAsync({ configType: editor.type, config });
      } else {
        await createMutation.mutateAsync({ configType: editor.type, config });
      }
      finishClose();
    } catch {
      showSettingsError(
        `Could not save ${editor.name} configuration`,
        "Please try again.",
      );
    }
  };

  return (
    <SettingsDrawer
      onClose={close}
      title={`${editor?.configured ? "Edit" : "Configure"} ${editor?.name ?? "tool"}`}
      visible={Boolean(editor)}
    >
      <ThemedText style={styles.drawerDescription} themeColor="textSecondary">
        This sensitive configuration is decrypted only while this drawer is open
        and encrypted again when saved.
      </ThemedText>
      {configQuery.isPending ? (
        <View style={styles.drawerState}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : configQuery.isError ? (
        <InlineError
          label="Failed to load the configuration."
          onRetry={() => void configQuery.refetch()}
        />
      ) : (
        <>
          <ThemedText style={styles.inputLabel}>Configuration JSON</ThemedText>
          <SettingsTextInput
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={(value) => {
              setConfigText(value);
              setValidationError(null);
            }}
            placeholder={'{"token": "..."}'}
            spellCheck={false}
            style={[styles.jsonInput, { fontFamily: Fonts.mono }]}
            textAlignVertical="top"
            value={configText}
          />
          {validationError ? (
            <ThemedText style={styles.validation}>{validationError}</ThemedText>
          ) : null}
          <SaveButton
            disabled={false}
            label="Save configuration"
            onPress={() => void save()}
            pending={isSaving}
          />
        </>
      )}
      <View style={{ height: Math.max(insets.bottom - 20, 0) }} />
    </SettingsDrawer>
  );
}

function SshKeyDrawer({
  editor,
  onClose,
}: {
  editor: SshKey | "new" | null;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const createMutation = useCreateSshKey();
  const updateMutation = useUpdateSshKey();
  const isEditing = editor !== null && editor !== "new";
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!editor) return;
    setName(editor === "new" ? "" : editor.name);
    setValue(editor === "new" ? "" : editor.value);
  }, [editor]);

  const close = () => {
    if (isPending) return;
    finishClose();
  };

  const finishClose = () => {
    setName("");
    setValue("");
    onClose();
  };

  const save = async () => {
    if (!editor || !value.trim() || (!isEditing && !name.trim())) return;
    try {
      if (editor !== "new") {
        await updateMutation.mutateAsync({
          id: editor.id,
          value: value.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          value: value.trim(),
        });
      }
      finishClose();
    } catch {
      showSettingsError(
        "Could not save SSH key",
        isEditing ? "Failed to update SSH key." : "Failed to add SSH key.",
      );
    }
  };

  return (
    <SettingsDrawer
      onClose={close}
      title={isEditing ? "Edit SSH key" : "Add SSH key"}
      visible={Boolean(editor)}
    >
      <ThemedText style={styles.drawerDescription} themeColor="textSecondary">
        {isEditing
          ? `Update the public key for ${typeof editor === "object" && editor ? editor.name : "this key"}.`
          : "Add a public key for secure access to your workspaces."}
      </ThemedText>
      <View style={styles.formFields}>
        {!isEditing ? (
          <LabeledInput
            editable={!isPending}
            label="Name"
            onChangeText={setName}
            placeholder="e.g. My MacBook"
            value={name}
          />
        ) : null}
        <LabeledInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isPending}
          label="SSH public key"
          multiline
          onChangeText={setValue}
          placeholder="ssh-ed25519 AAAAC3..."
          style={styles.sshInput}
          textAlignVertical="top"
          value={value}
        />
      </View>
      <SaveButton
        disabled={!value.trim() || (!isEditing && !name.trim())}
        label="Save SSH key"
        onPress={() => void save()}
        pending={isPending}
      />
    </SettingsDrawer>
  );
}

function SettingsDrawer({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.drawerRoot}
      >
        <Pressable
          accessibilityLabel="Close settings drawer"
          accessibilityRole="button"
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
          <View style={styles.drawerHeader}>
            <ThemedText style={styles.drawerTitle}>{title}</ThemedText>
            <IconButton
              accessibilityLabel="Close"
              icon={{ ios: "xmark", android: "close" }}
              onPress={onClose}
            />
          </View>
          <ScrollView
            contentContainerStyle={styles.drawerContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </BottomDrawerPanel>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function InlineError({
  label,
  onRetry,
}: {
  label: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.inlineErrorWrap}>
      <ThemedText style={styles.inlineError}>{label}</ThemedText>
      <SmallButton label="Try again" onPress={onRetry} />
    </View>
  );
}

function ServerSettingsState({
  query,
  children,
}: {
  query: ReturnType<typeof useUserSettings>;
  children: ReactNode;
}) {
  const theme = useTheme();
  if (query.isPending) {
    return (
      <View style={styles.serverState}>
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }
  if (query.isError || !query.data) {
    return (
      <InlineError
        label="Failed to load settings."
        onRetry={() => void query.refetch()}
      />
    );
  }
  return children;
}

function LoadingBlocks() {
  const theme = useTheme();
  return (
    <View style={styles.loadingBlocks}>
      {[1, 2].map((item) => (
        <View
          key={item}
          style={[
            styles.loadingBlock,
            { backgroundColor: theme.backgroundElement },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  headerButton: {
    alignItems: "center",
    borderRadius: 21,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  headerTitle: { fontSize: 17, fontWeight: "600" },
  content: { paddingBottom: 48, paddingHorizontal: 20 },
  section: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 26 },
  sectionHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  sectionDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  sectionBody: { marginTop: 20 },
  optionList: { gap: 10 },
  option: {
    alignItems: "center",
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionCopy: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: "600" },
  optionDescription: { fontSize: 12, lineHeight: 17 },
  settingsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
    paddingVertical: 10,
  },
  rowCopy: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowDescription: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  inlineError: { color: "#ef4444", fontSize: 12 },
  inlineErrorWrap: {
    alignItems: "center",
    gap: 12,
    minHeight: 110,
    justifyContent: "center",
  },
  serverState: {
    alignItems: "center",
    minHeight: 82,
    justifyContent: "center",
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  formFields: { gap: 14 },
  labeledInput: { gap: 6 },
  inputLabel: { fontSize: 12, lineHeight: 16 },
  saveButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: 11,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 15,
  },
  saveLabel: { fontSize: 13, fontWeight: "700" },
  smallButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 12,
  },
  smallButtonLabel: { fontSize: 12, fontWeight: "600" },
  iconButton: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  keyIcon: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  keyName: { flex: 1, fontSize: 14, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    gap: 10,
    minHeight: 150,
    justifyContent: "center",
  },
  loadingBlocks: { gap: 10 },
  loadingBlock: { borderRadius: 12, height: 60 },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.38 },
  drawerRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.48)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  drawer: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "92%",
    minHeight: 360,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: "center",
    borderRadius: 2,
    height: 4,
    marginBottom: 12,
    width: 38,
  },
  drawerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  drawerTitle: {
    flex: 1,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  drawerContent: { paddingBottom: 4 },
  drawerDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
    marginTop: 4,
  },
  drawerState: {
    alignItems: "center",
    minHeight: 240,
    justifyContent: "center",
  },
  jsonInput: { fontSize: 12, height: 260, lineHeight: 18, marginTop: 6 },
  sshInput: { height: 120 },
  validation: { color: "#ef4444", fontSize: 12, lineHeight: 17, marginTop: 7 },
});
