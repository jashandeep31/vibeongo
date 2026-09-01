"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { SshKeyDialog } from "@/components/dialogs/ssh-key-dialog";
import { UserConfigDialog } from "@/components/dialogs/user-config-dialog";
import { logout } from "@/services/auth-services";
import { useDeleteSshKey, useSshKeys } from "@repo/api-hooks";
import {
  useUpdateUserSettings,
  useUserConfigs,
  useUserSettings,
} from "@repo/api-hooks";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Bot,
  Check,
  KeyRound,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Save,
  Settings2,
  Sun,
  TimerReset,
  Trash2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

const AUTO_TERMINATE_MIN_MINUTES = 15;
const AUTO_TERMINATE_MAX_MINUTES = 1200;

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Bright and clear.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Easy on the eyes.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device.",
    icon: Monitor,
  },
] as const;

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
    type: "fx",
    name: "FX",
    description: "FX authentication configuration.",
  },
] as const;

function SettingsSection({
  title,
  description,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Settings2;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="py-3 md:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Icon className="text-muted-foreground mt-1 size-4 shrink-0" />
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {description}
            </p>
          </div>
        </div>
        {action}
      </div>
      <div className="mt-7 pl-0 md:pl-8">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme = "system", setTheme } = useTheme();
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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      toast.error("Telegram chat ID must be a whole number");
      return;
    }
    try {
      await updateTelegramSettings.mutateAsync({
        telegramChatId: parsedChatId,
      });
      setIsTelegramDirty(false);
      toast.success("Telegram chat ID saved");
    } catch {
      toast.error("Failed to save Telegram chat ID");
    }
  };

  const saveModels = async () => {
    try {
      await updateModelSettings.mutateAsync(modelForm);
      setIsModelFormDirty(false);
      toast.success("Default models saved");
    } catch {
      toast.error("Failed to save default models");
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
      toast.error("Use whole minutes from 15 to 1200");
      return;
    }
    try {
      await updateTerminationSettings.mutateAsync(values);
      setIsTerminationFormDirty(false);
      toast.success("Auto-termination settings saved");
    } catch {
      toast.error("Failed to save auto-termination settings");
    }
  };

  const handleDeleteSshKey = async (id: string) => {
    try {
      await deleteSshKey.mutateAsync(id);
      toast.success("SSH key deleted");
    } catch {
      toast.error("Failed to delete SSH key");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      toast.error("Failed to log out");
    }
  };

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-5 py-8 md:space-y-16 md:px-10 md:py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      </header>

      <SettingsSection
        title="Appearance"
        description="Choose how the AI Playground looks on this device."
        icon={Sun}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setTheme(option.value)}
                className="hover:bg-muted/50 aria-pressed:border-foreground flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors"
              >
                <span className="bg-muted rounded-md p-2">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="text-muted-foreground block text-xs">
                    {option.description}
                  </span>
                </span>
                {selected ? <Check className="text-primary size-4" /> : null}
              </button>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Tool configurations"
        description="Encrypted authentication settings for your coding tools."
        icon={Bot}
      >
        <div className="space-y-3">
          {configTypes.map((config) => {
            const configured = (configsQuery.data ?? []).some(
              (item) => item.config_type === config.type,
            );
            return (
              <div
                key={config.type}
                className="flex items-center justify-between gap-8 py-2"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium">{config.name}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {config.description}
                  </p>
                </div>
                {configsQuery.isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : configsQuery.isError ? (
                  <p className="text-destructive text-xs">Load failed</p>
                ) : (
                  <UserConfigDialog
                    configType={config.type}
                    name={config.name}
                    isConfigured={configured}
                  />
                )}
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <div className="space-y-12 md:space-y-16">
        <SettingsSection
          title="Telegram"
          description="Chat ID used for bot notifications."
          icon={Bot}
        >
          {settingsQuery.isLoading ? (
            <Skeleton className="h-9 max-w-xl" />
          ) : settingsQuery.isError ? (
            <p className="text-destructive text-sm">Failed to load settings.</p>
          ) : (
            <Input
              inputMode="numeric"
              value={telegramChatId}
              onChange={(event) => {
                setTelegramChatId(event.target.value);
                setIsTelegramDirty(true);
              }}
              placeholder="e.g. -1001234567890"
              disabled={!userSettings || updateTelegramSettings.isPending}
              aria-label="Telegram chat ID"
              className="max-w-xl"
            />
          )}
          <div className="mt-4 flex max-w-xl justify-end">
            <Button
              type="button"
              size="sm"
              onClick={saveTelegram}
              disabled={
                !userSettings ||
                !isTelegramDirty ||
                updateTelegramSettings.isPending
              }
            >
              <Save />
              {updateTelegramSettings.isPending ? "Saving..." : "Save Telegram"}
            </Button>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Default models"
          description="Models used when a workflow does not specify one."
          icon={Settings2}
        >
          <div className="grid max-w-2xl gap-5">
            {modelRows.map((row) => (
              <label key={row.name} className="grid gap-1.5">
                <span className="text-muted-foreground text-xs">
                  {row.label}
                </span>
                <Input
                  value={modelForm[row.name]}
                  onChange={(event) => {
                    setModelForm((current) => ({
                      ...current,
                      [row.name]: event.target.value,
                    }));
                    setIsModelFormDirty(true);
                  }}
                  disabled={!userSettings || updateModelSettings.isPending}
                />
              </label>
            ))}
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                onClick={saveModels}
                disabled={
                  !userSettings ||
                  !isModelFormDirty ||
                  updateModelSettings.isPending
                }
              >
                <Save />
                {updateModelSettings.isPending ? "Saving..." : "Save models"}
              </Button>
            </div>
          </div>
        </SettingsSection>
      </div>

      <SettingsSection
        title="Instance auto-termination"
        description="Stop idle runtimes automatically. Values are in minutes (15–1200)."
        icon={TimerReset}
      >
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-3">
            {terminationRows.map((row) => (
              <label key={row.name} className="grid gap-1.5">
                <span className="text-muted-foreground text-xs">
                  {row.label}
                </span>
                <Input
                  type="number"
                  min={AUTO_TERMINATE_MIN_MINUTES}
                  max={AUTO_TERMINATE_MAX_MINUTES}
                  step={1}
                  value={terminationForm[row.name]}
                  onChange={(event) => {
                    setTerminationForm((current) => ({
                      ...current,
                      [row.name]: event.target.value,
                    }));
                    setIsTerminationFormDirty(true);
                  }}
                  disabled={
                    !userSettings || updateTerminationSettings.isPending
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={saveTermination}
              disabled={
                !userSettings ||
                !isTerminationFormDirty ||
                updateTerminationSettings.isPending
              }
            >
              <Save />
              {updateTerminationSettings.isPending
                ? "Saving..."
                : "Save auto-termination"}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="SSH keys"
        description="Public keys allowed to connect to your workspaces."
        icon={KeyRound}
        action={
          <SshKeyDialog>
            <Button size="sm" variant="outline">
              <Plus /> Add key
            </Button>
          </SshKeyDialog>
        }
      >
        {sshKeysQuery.isLoading ? (
          <div className="grid gap-2">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : sshKeysQuery.isError ? (
          <p className="text-destructive text-sm">Failed to load SSH keys.</p>
        ) : sshKeysQuery.data?.length ? (
          <div className="space-y-3">
            {sshKeysQuery.data.map((sshKey) => (
              <div
                key={sshKey.id}
                className="flex items-center justify-between gap-6 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-muted rounded-md p-2">
                    <KeyRound className="size-4" />
                  </span>
                  <span className="truncate text-sm font-medium">
                    {sshKey.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <SshKeyDialog sshKey={sshKey}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${sshKey.name}`}
                    >
                      <Pencil />
                    </Button>
                  </SshKeyDialog>
                  <ConfirmationDialog
                    title="Delete SSH key?"
                    description={`Remove ${sshKey.name} from your account. This cannot be undone.`}
                    confirmText="Delete"
                    isDestructive
                    onConfirm={() => void handleDeleteSshKey(sshKey.id)}
                  >
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:text-destructive"
                      aria-label={`Delete ${sshKey.name}`}
                      disabled={deleteSshKey.isPending}
                    >
                      <Trash2 />
                    </Button>
                  </ConfirmationDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground py-12 text-center text-sm">
            <KeyRound className="mx-auto mb-3 size-7 opacity-50" />
            No SSH keys configured.
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        title="Session"
        description="Sign out of AI Playground on this device."
        icon={LogOut}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleLogout()}
          disabled={isLoggingOut}
        >
          <LogOut />
          {isLoggingOut ? "Logging out..." : "Log out"}
        </Button>
      </SettingsSection>

      <SettingsSection
        title="Delete account"
        description="Request permanent deletion of your account and associated data."
        icon={Trash2}
      >
        <p className="text-muted-foreground text-sm">
          To delete your account, please email us at{" "}
          <a
            href="mailto:jashan.signup@gmail.com?subject=Account%20deletion%20request"
            className="text-foreground font-medium underline underline-offset-4"
          >
            jashan.signup@gmail.com
          </a>
          .
        </p>
      </SettingsSection>
    </div>
  );
}
