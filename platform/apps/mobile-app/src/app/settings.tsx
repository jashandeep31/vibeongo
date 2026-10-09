import { GithubConnectionSettings } from "@/components/auth/github-connection-settings";
import type { ApiKey, UserConfigValue } from "@repo/api-client";
import {
  useApiKeys,
  useCreateApiKey,
  useDeleteApiKey,
  useRotateApiKey,
  useProviderCredentials,
  useCreateSshKey,
  useCreateUserConfig,
  useDeleteSshKey,
  useSshKeys,
  useSetForgejoPassword,
  useUpdateSshKey,
  useUpdateUserConfig,
  useUpdateUserSettings,
  useUserConfig,
  useUserConfigs,
  useUserSettings,
} from "@repo/api-hooks";
import { useQueryClient } from "@repo/api-hooks";
import { opencodeCredentialsValidator } from "@repo/shared";
import * as Linking from "expo-linking";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { ModelInput } from "@/components/model-input";
import {
  PageChromeLayout,
  PageHeader,
  usePageTitleScrollFade,
} from "@/components/page-chrome";
import { ThemedText } from "@/components/themed-text";
import { Fonts } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  getNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound";
import {
  type ThemePreference,
  useThemePreference,
} from "@/providers/theme-preference-provider";

const AUTO_TERMINATE_MIN_MINUTES = 15;
const AUTO_TERMINATE_MAX_MINUTES = 1200;
const FORGEJO_URL = "https://forgejo.devsradar.com/";

function showSettingsError(text1: string, text2?: string) {
  Toast.show({ type: "error", text1, text2 });
}

const themeOptions: Array<{
  value: ThemePreference;
  label: string;
  icon: SymbolViewProps["name"];
}> = [
  {
    value: "system",
    label: "System",
    icon: { ios: "gearshape", android: "settings" },
  },
  {
    value: "light",
    label: "Light",
    icon: { ios: "sun.max", android: "light_mode" },
  },
  {
    value: "dark",
    label: "Dark",
    icon: { ios: "moon", android: "dark_mode" },
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
  {
    type: "claude",
    name: "Claude Code",
    description: "Claude Code authentication configuration.",
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
  const { onTitleScroll, titleOpacity } = usePageTitleScrollFade();
  const { preference, setPreference } = useThemePreference();
  const settingsQuery = useUserSettings();
  const configsQuery = useUserConfigs();
  const sshKeysQuery = useSshKeys();
  const [apiKeyPage, setApiKeyPage] = useState(1);
  const apiKeysQuery = useApiKeys({ page: apiKeyPage, limit: 10 });
  const providerCredentialsQuery = useProviderCredentials();
  const deleteApiKey = useDeleteApiKey();
  const [apiKeyEditor, setApiKeyEditor] = useState<ApiKey | "new" | null>(null);
  const [apiKeyToRevoke, setApiKeyToRevoke] = useState<ApiKey | null>(null);
  const updateTelegramSettings = useUpdateUserSettings();
  const updateModelSettings = useUpdateUserSettings();
  const updateTerminationSettings = useUpdateUserSettings();
  const setForgejoPassword = useSetForgejoPassword();
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
  const [forgejoPassword, setForgejoPasswordValue] = useState("");
  const [forgejoPasswordConfirmation, setForgejoPasswordConfirmation] =
    useState("");
  const [configEditor, setConfigEditor] = useState<{
    type: ConfigType;
    name: string;
    configured: boolean;
  } | null>(null);
  const [sshEditor, setSshEditor] = useState<SshKey | "new" | null>(null);
  const [sshKeyToDelete, setSshKeyToDelete] = useState<SshKey | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    void getNotificationSoundEnabled().then((enabled) => {
      if (active) setSoundEnabled(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  const toggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    void setNotificationSoundEnabled(enabled).catch(() =>
      showSettingsError(
        "Could not save notification sound",
        "Please try again.",
      ),
    );
  };

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

  const saveForgejoPassword = async () => {
    if (forgejoPassword.length < 4 || forgejoPassword.length > 20) {
      showSettingsError(
        "Invalid password",
        "Password must be between 4 and 20 characters.",
      );
      return;
    }
    if (forgejoPassword !== forgejoPasswordConfirmation) {
      showSettingsError(
        "Passwords do not match",
        "Enter the same password twice.",
      );
      return;
    }
    try {
      await setForgejoPassword.mutateAsync({ password: forgejoPassword });
      setForgejoPasswordValue("");
      setForgejoPasswordConfirmation("");
      Toast.show({ type: "success", text1: "Forgejo password updated" });
    } catch {
      showSettingsError(
        "Could not update Forgejo password",
        "Please try again.",
      );
    }
  };

  const refresh = () => {
    void Promise.all([
      settingsQuery.refetch(),
      configsQuery.refetch(),
      sshKeysQuery.refetch(),
      apiKeysQuery.refetch(),
      providerCredentialsQuery.refetch(),
    ]);
  };

  const isRefreshing =
    settingsQuery.isRefetching ||
    configsQuery.isRefetching ||
    sshKeysQuery.isRefetching ||
    apiKeysQuery.isRefetching ||
    providerCredentialsQuery.isRefetching;

  const revokeApiKey = async () => {
    if (!apiKeyToRevoke || deleteApiKey.isPending) return;
    try {
      await deleteApiKey.mutateAsync(apiKeyToRevoke.id);
      setApiKeyToRevoke(null);
      Toast.show({ type: "success", text1: "API key revoked" });
    } catch {
      showSettingsError("Could not revoke API key", "Please try again.");
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[styles.screen, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screen}
      >
        <PageChromeLayout
          top={
            <ScreenHeader
              onBack={() => router.back()}
              titleOpacity={titleOpacity}
            />
          }
        >
          {({ topInset }) => (
            <ScrollView
              automaticallyAdjustKeyboardInsets
              onScroll={onTitleScroll}
              scrollEventThrottle={16}
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
              <GithubConnectionSettings />

              <SettingsSection
                icon={{ ios: "sun.max", android: "light_mode" }}
                title="Appearance"
              >
                <View style={styles.appearanceOptions}>
                  {themeOptions.map((option) => {
                    const selected = preference === option.value;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected }}
                        key={option.value}
                        onPress={() => void setPreference(option.value)}
                        style={({ pressed }) => [
                          styles.appearanceOption,
                          {
                            backgroundColor: theme.background,
                            borderColor: selected
                              ? theme.text
                              : theme.backgroundSelected,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.appearanceIcon,
                            {
                              backgroundColor: selected
                                ? theme.backgroundElement
                                : theme.background,
                            },
                          ]}
                        >
                          <SymbolView
                            name={option.icon}
                            size={16}
                            tintColor={
                              selected ? theme.text : theme.textSecondary
                            }
                          />
                        </View>
                        <ThemedText
                          style={[
                            styles.appearanceLabel,
                            !selected && { color: theme.textSecondary },
                          ]}
                        >
                          {option.label}
                        </ThemedText>
                        {selected ? (
                          <View
                            style={[
                              styles.selectedIndicator,
                              { backgroundColor: theme.text },
                            ]}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </SettingsSection>

              <SettingsSection
                action={
                  <Switch
                    accessibilityLabel="Notification sound"
                    onValueChange={toggleSound}
                    value={soundEnabled}
                  />
                }
                icon={{ ios: "bell", android: "notifications" }}
                title="Notification sound"
              />

              <SettingsSection
                icon={{ ios: "key", android: "key" }}
                title="API keys"
                description="Keys for the CLI."
                action={
                  <CredentialButton
                    label="Create key"
                    icon={{ ios: "plus", android: "add" }}
                    onPress={() => setApiKeyEditor("new")}
                  />
                }
              >
                {apiKeysQuery.isPending ? (
                  <LoadingBlocks />
                ) : apiKeysQuery.isError ? (
                  <InlineError
                    label="Failed to load API keys."
                    onRetry={() => void apiKeysQuery.refetch()}
                  />
                ) : apiKeysQuery.data?.data.length ? (
                  <View
                    style={[
                      styles.credentialGroup,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    {apiKeysQuery.data.data.map((key, index, keys) => {
                      const status = key.revoked_at
                        ? "Revoked"
                        : key.expires_at &&
                            new Date(key.expires_at).getTime() <= Date.now()
                          ? "Expired"
                          : "Active";
                      return (
                        <View
                          key={key.id}
                          style={[
                            styles.apiKeyRow,
                            index < keys.length - 1 && {
                              borderBottomWidth: StyleSheet.hairlineWidth,
                              borderBottomColor: theme.backgroundSelected,
                            },
                          ]}
                        >
                          <View style={styles.credentialCopy}>
                            <View style={styles.apiKeyHeading}>
                              <ThemedText
                                style={styles.credentialName}
                                numberOfLines={1}
                              >
                                {key.name}
                              </ThemedText>
                              <ThemedText
                                themeColor="textSecondary"
                                style={styles.credentialCaption}
                              >
                                {status}
                              </ThemedText>
                            </View>
                            <ThemedText
                              themeColor="textSecondary"
                              style={styles.credentialCaption}
                            >
                              {key.last_used_at
                                ? `Last used ${formatCredentialDate(key.last_used_at)}`
                                : "Never used"}
                            </ThemedText>
                            <ThemedText
                              themeColor="textSecondary"
                              style={styles.credentialCaption}
                            >
                              Created {formatCredentialDate(key.created_at)}
                              {key.expires_at
                                ? ` · Expires ${formatCredentialDate(key.expires_at)}`
                                : " · No expiry"}
                            </ThemedText>
                          </View>
                          {!key.revoked_at ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Manage API key ${key.name}`}
                              accessibilityState={{
                                disabled: deleteApiKey.isPending,
                              }}
                              disabled={deleteApiKey.isPending}
                              onPress={() =>
                                Alert.alert(key.name, "Manage this API key.", [
                                  {
                                    text: "Rotate key",
                                    onPress: () => setApiKeyEditor(key),
                                  },
                                  {
                                    text: "Revoke key",
                                    style: "destructive",
                                    onPress: () => setApiKeyToRevoke(key),
                                  },
                                  { text: "Cancel", style: "cancel" },
                                ])
                              }
                              style={({ pressed }) => [
                                styles.credentialMenu,
                                pressed && styles.pressed,
                                deleteApiKey.isPending && styles.disabled,
                              ]}
                            >
                              <SymbolView
                                name={{
                                  ios: "ellipsis",
                                  android: "more_horiz",
                                }}
                                size={20}
                                tintColor={theme.textSecondary}
                              />
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.credentialEmpty}>
                    <ThemedText style={styles.credentialName}>
                      No API keys yet
                    </ThemedText>
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.credentialBody}
                    >
                      Create a key to sign in from your computer.
                    </ThemedText>
                  </View>
                )}
                {apiKeyPage > 1 || apiKeysQuery.data?.hasNext ? (
                  <View style={styles.credentialPagination}>
                    <CredentialButton
                      label="Previous"
                      onPress={() => setApiKeyPage((page) => page - 1)}
                      disabled={apiKeyPage === 1 || apiKeysQuery.isFetching}
                    />
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.credentialCaption}
                    >
                      Page {apiKeyPage}
                    </ThemedText>
                    <CredentialButton
                      label="Next"
                      onPress={() => setApiKeyPage((page) => page + 1)}
                      disabled={
                        !apiKeysQuery.data?.hasNext || apiKeysQuery.isFetching
                      }
                    />
                  </View>
                ) : null}
              </SettingsSection>

              <SettingsSection
                icon={{ ios: "link", android: "link" }}
                title="Provider connections"
                description="Connected coding accounts."
                action={
                  <CredentialButton
                    accessibilityLabel="Refresh provider connections"
                    icon={{ ios: "arrow.clockwise", android: "refresh" }}
                    onPress={() => void providerCredentialsQuery.refetch()}
                    disabled={providerCredentialsQuery.isFetching}
                  />
                }
              >
                {providerCredentialsQuery.isPending ? (
                  <LoadingBlocks />
                ) : providerCredentialsQuery.isError ? (
                  <InlineError
                    label="Failed to load provider connections."
                    onRetry={() => void providerCredentialsQuery.refetch()}
                  />
                ) : providerCredentialsQuery.data?.data.length ? (
                  <View style={styles.providerList}>
                    {providerCredentialsQuery.data.data.map((connection) => (
                      <View
                        key={connection.provider}
                        style={[
                          styles.credentialGroup,
                          { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <View
                          style={[
                            styles.providerHeader,
                            { borderBottomColor: theme.backgroundSelected },
                          ]}
                        >
                          <ThemedText style={styles.credentialName}>
                            {connection.provider === "codex"
                              ? "Codex"
                              : connection.provider}
                          </ThemedText>
                          <ThemedText
                            themeColor="textSecondary"
                            style={styles.credentialCaption}
                          >
                            {connection.auth_type === "oauth"
                              ? "OAuth"
                              : "API key"}
                          </ThemedText>
                        </View>
                        <View style={styles.providerDetails}>
                          <CredentialDetail
                            label="Access expires"
                            value={connection.access_token_expires_at}
                          />
                          <CredentialDetail
                            label="Refresh expires"
                            value={connection.refresh_token_expires_at}
                          />
                          <CredentialDetail
                            label="Last updated"
                            value={connection.updated_at}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.credentialEmpty}>
                    <ThemedText style={styles.credentialName}>
                      No connected providers
                    </ThemedText>
                    <ThemedText
                      themeColor="textSecondary"
                      style={styles.credentialBody}
                    >
                      Connect ChatGPT from your computer using the Vibeongo CLI.
                    </ThemedText>
                  </View>
                )}
                {!providerCredentialsQuery.isPending &&
                !providerCredentialsQuery.isError &&
                providerCredentialsQuery.data?.data.length ? (
                  <ThemedText
                    themeColor="textSecondary"
                    style={styles.credentialFootnote}
                  >
                    Manage your ChatGPT connection with the Vibeongo CLI.
                  </ThemedText>
                ) : null}
              </SettingsSection>

              <SettingsSection
                icon={{ ios: "cpu", android: "smart_toy" }}
                title="Tool configurations"
              >
                {configTypes.map((config, index) => {
                  const configured = (configsQuery.data ?? []).some(
                    (item) => item.config_type === config.type,
                  );
                  return (
                    <SettingsRow
                      key={config.type}
                      last={index === configTypes.length - 1}
                    >
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
                      <View key={row.name} style={styles.labeledInput}>
                        <ThemedText
                          style={styles.inputLabel}
                          themeColor="textSecondary"
                        >
                          {row.label}
                        </ThemedText>
                        <ModelInput
                          editable={
                            Boolean(userSettings) &&
                            !updateModelSettings.isPending
                          }
                          onChangeText={(value) => {
                            setModelForm((current) => ({
                              ...current,
                              [row.name]: value,
                            }));
                            setIsModelFormDirty(true);
                          }}
                          value={modelForm[row.name]}
                        />
                      </View>
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

              <SettingsSection
                description="Set the password used to sign in to your Forgejo account. Use 4–20 characters."
                icon={{ ios: "lock", android: "lock" }}
                title="Forgejo password"
              >
                <Pressable
                  accessibilityHint="Opens Forgejo in your browser"
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL(FORGEJO_URL).catch(() =>
                      showSettingsError(
                        "Could not open Forgejo",
                        "Please try again.",
                      ),
                    );
                  }}
                  style={({ pressed }) => [
                    styles.externalLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText style={styles.externalLinkLabel}>
                    Open Forgejo
                  </ThemedText>
                  <SymbolView
                    name={{ ios: "arrow.up.right", android: "open_in_new" }}
                    size={15}
                    tintColor={theme.text}
                  />
                </Pressable>
                <View style={styles.formFields}>
                  <LabeledInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!setForgejoPassword.isPending}
                    label="New password"
                    maxLength={20}
                    onChangeText={setForgejoPasswordValue}
                    secureTextEntry
                    textContentType="newPassword"
                    value={forgejoPassword}
                  />
                  <LabeledInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!setForgejoPassword.isPending}
                    label="Confirm password"
                    maxLength={20}
                    onChangeText={setForgejoPasswordConfirmation}
                    secureTextEntry
                    textContentType="newPassword"
                    value={forgejoPasswordConfirmation}
                  />
                </View>
                <SaveButton
                  disabled={!forgejoPassword || !forgejoPasswordConfirmation}
                  label="Save Forgejo password"
                  onPress={() => void saveForgejoPassword()}
                  pending={setForgejoPassword.isPending}
                />
              </SettingsSection>
            </ScrollView>
          )}
        </PageChromeLayout>
      </KeyboardAvoidingView>

      <ApiKeyDrawer
        editor={apiKeyEditor}
        onClose={() => setApiKeyEditor(null)}
      />
      <ConfirmationDrawer
        title="Revoke API key?"
        description={`Revoke ${apiKeyToRevoke?.name ?? "this key"}. Apps using this key will lose access.`}
        confirmLabel="Revoke"
        isConfirming={deleteApiKey.isPending}
        onCancel={() => {
          if (!deleteApiKey.isPending) setApiKeyToRevoke(null);
        }}
        onConfirm={() => void revokeApiKey()}
        visible={Boolean(apiKeyToRevoke)}
      />
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

function ScreenHeader({
  onBack,
  titleOpacity,
}: {
  onBack: () => void;
  titleOpacity: ComponentProps<typeof PageHeader>["titleOpacity"];
}) {
  return (
    <PageHeader onBack={onBack} title="Settings" titleOpacity={titleOpacity} />
  );
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
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[styles.section, { borderBottomColor: theme.backgroundSelected }]}
    >
      <View style={[styles.sectionHeader, !children && styles.centered]}>
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
      {children ? <View style={styles.sectionBody}>{children}</View> : null}
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
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,
        { borderColor: theme.backgroundSelected },
        disabled && styles.disabled,
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

// OpenCode takes the `opencode auth export` array, the other tools a JSON object
const emptyConfigText = (configType: ConfigType) =>
  configType === "opencode" ? "[]" : "{}";

const validateUserConfig = (
  configType: ConfigType,
  config: unknown,
): string | null => {
  if (configType === "opencode") {
    return opencodeCredentialsValidator.safeParse(config).success
      ? null
      : "Paste the JSON array printed by `opencode auth export`.";
  }
  return config === null || typeof config !== "object" || Array.isArray(config)
    ? "The configuration must be a JSON object."
    : null;
};

function formatCredentialDate(
  value: string | null,
  includeTime = false,
  fallback = "Not available",
) {
  const date = value ? new Date(value) : null;
  if (!date || !Number.isFinite(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? ({ hour: "numeric", minute: "2-digit" } as const) : {}),
  }).format(date);
}

function CredentialDetail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <View style={styles.credentialDetail}>
      <ThemedText
        themeColor="textSecondary"
        style={styles.credentialDetailLabel}
      >
        {label}
      </ThemedText>
      <ThemedText style={styles.credentialValue}>
        {formatCredentialDate(value, true)}
      </ThemedText>
    </View>
  );
}

function CredentialButton({
  label,
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  primary = false,
  pending = false,
}: {
  label?: string;
  icon?: SymbolViewProps["name"];
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  primary?: boolean;
  pending?: boolean;
}) {
  const theme = useTheme();
  const inactive = disabled || pending;
  const color = primary ? theme.background : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: pending }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.credentialButton,
        primary && { backgroundColor: theme.text },
        inactive && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {pending ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <SymbolView name={icon} size={18} tintColor={color} />
      ) : null}
      {label ? (
        <ThemedText style={[styles.credentialButtonLabel, { color }]}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

function ApiKeyDrawer({
  editor,
  onClose,
}: {
  editor: ApiKey | "new" | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const create = useCreateApiKey();
  const rotate = useRotateApiKey();
  const pending = create.isPending || rotate.isPending;
  const rotating = editor !== null && editor !== "new";

  const close = () => {
    if (pending) return;
    setName("");
    setSecret(null);
    // Clear the one-time secret from mutation state as well as the drawer.
    create.reset();
    rotate.reset();
    onClose();
  };

  const save = async () => {
    if (!editor || pending || (editor === "new" && !name.trim())) return;
    try {
      const result =
        editor === "new"
          ? await create.mutateAsync({ name: name.trim() })
          : await rotate.mutateAsync(editor.id);
      setSecret(result.data.key);
      Toast.show({
        type: "success",
        text1: rotating ? "API key rotated" : "API key created",
      });
    } catch {
      showSettingsError(
        rotating ? "Could not rotate API key" : "Could not create API key",
        "Please try again.",
      );
    }
  };

  const copy = async () => {
    if (!secret) return;
    try {
      await Clipboard.setStringAsync(secret);
      Toast.show({ type: "success", text1: "API key copied" });
    } catch {
      showSettingsError("Could not copy API key", "Please try again.");
    }
  };

  return (
    <SettingsDrawer
      visible={Boolean(editor)}
      onClose={close}
      title={
        secret
          ? "Your new API key"
          : rotating
            ? "Rotate API key?"
            : "Create API key"
      }
    >
      <ThemedText themeColor="textSecondary" style={styles.drawerDescription}>
        {secret
          ? "Copy this key now. You will not be able to see it again."
          : rotating
            ? `Replace the key for ${editor.name}. The old key will stop working immediately.`
            : "Give this key a name so you can identify it later."}
      </ThemedText>
      {secret ? (
        <>
          <View
            style={[
              styles.credentialSecret,
              { backgroundColor: theme.backgroundElement },
            ]}
          >
            <ThemedText
              selectable
              accessibilityLabel={`New API key: ${secret}`}
              style={styles.credentialSecretText}
            >
              {secret}
            </ThemedText>
          </View>
          <View style={styles.credentialDrawerActions}>
            <CredentialButton
              label="Copy key"
              icon={{ ios: "doc.on.doc", android: "content_copy" }}
              onPress={() => void copy()}
            />
            <CredentialButton label="Done" primary onPress={close} />
          </View>
        </>
      ) : (
        <>
          {!rotating ? (
            <LabeledInput
              label="Name"
              placeholder="e.g. My laptop"
              value={name}
              onChangeText={setName}
              maxLength={255}
              editable={!pending}
              autoCapitalize="none"
              autoCorrect={false}
            />
          ) : null}
          <View style={styles.credentialDrawerActions}>
            <CredentialButton
              label="Cancel"
              onPress={close}
              disabled={pending}
            />
            <CredentialButton
              label={rotating ? "Rotate key" : "Create key"}
              primary
              disabled={!rotating && !name.trim()}
              pending={pending}
              onPress={() => void save()}
            />
          </View>
        </>
      )}
    </SettingsDrawer>
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
    const config = configQuery.data?.config;
    setConfigText(
      config ? JSON.stringify(config, null, 2) : emptyConfigText(editor.type),
    );
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
    const configError = validateUserConfig(editor.type, parsed);
    if (configError) {
      setValidationError(configError);
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
      {editor?.type === "claude" ? (
        <View style={styles.notice}>
          <SymbolView
            name={{
              ios: "exclamationmark.triangle.fill",
              android: "warning",
            }}
            size={16}
            tintColor="#b45309"
          />
          <View style={styles.noticeCopy}>
            <ThemedText style={styles.noticeTitle}>
              Claude Code is not supported yet
            </ThemedText>
            <ThemedText style={styles.noticeText}>
              You can save your configuration now, but it is not applied to your
              instances until Claude Code support is ready.
            </ThemedText>
          </View>
        </View>
      ) : null}
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
  credentialGroup: { borderRadius: 12, overflow: "hidden" },
  apiKeyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 16,
    gap: 8,
  },
  credentialCopy: { flex: 1, gap: 4 },
  apiKeyHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: 12,
    rowGap: 4,
  },
  credentialName: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "600",
    flexShrink: 1,
  },
  credentialCaption: { fontSize: 12, lineHeight: 18 },
  credentialBody: { fontSize: 14, lineHeight: 20 },
  credentialMenu: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  credentialEmpty: { paddingVertical: 8, gap: 8 },
  credentialFootnote: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  providerList: { gap: 16 },
  providerHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  providerDetails: { padding: 16, gap: 16 },
  credentialDetail: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  credentialDetailLabel: { fontSize: 13, lineHeight: 19, flex: 1 },
  credentialValue: {
    fontSize: 13,
    lineHeight: 19,
    flex: 1.5,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  credentialButton: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  credentialButtonLabel: { fontSize: 13, lineHeight: 19, fontWeight: "600" },
  credentialPagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 12,
  },
  credentialSecret: { padding: 16, borderRadius: 12 },
  credentialSecretText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 21,
  },
  credentialDrawerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },

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
  centered: { alignItems: "center" },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: "700", lineHeight: 21 },
  sectionDescription: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  sectionBody: { marginTop: 20 },
  appearanceIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  appearanceLabel: { fontSize: 12, fontWeight: "600" },
  appearanceOption: {
    aspectRatio: 1,
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    gap: 20,
    justifyContent: "space-between",
    overflow: "hidden",
    padding: 12,
  },
  appearanceOptions: { flexDirection: "row", gap: 10 },
  selectedIndicator: {
    borderRadius: 4,
    bottom: 0,
    height: 4,
    left: 0,
    position: "absolute",
    right: 0,
  },
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
  externalLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    marginBottom: 18,
  },
  externalLinkLabel: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
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
  notice: {
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderColor: "rgba(245, 158, 11, 0.35)",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    padding: 12,
  },
  noticeCopy: { flex: 1, gap: 2 },
  noticeText: { color: "#b45309", fontSize: 12, lineHeight: 17 },
  noticeTitle: { color: "#b45309", fontSize: 13, fontWeight: "700" },
  sshInput: { height: 120 },
  validation: { color: "#ef4444", fontSize: 12, lineHeight: 17, marginTop: 7 },
});
