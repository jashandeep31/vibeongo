"use client";

import { useEffect, useState } from "react";
import { useUpdateUserSettings, useUserSettings } from "@/hooks/use-user";
import { useDeleteSshKey, useSshKeys } from "@/hooks/use-ssh-keys";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";
import { EditSshKeyDialog } from "@/components/dialogs/edit-ssh-key-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import {
  Check,
  Key,
  Monitor,
  Moon,
  Pencil,
  Save,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const themeOptions = [
  {
    value: "light",
    label: "Light",
    description: "Use a bright interface.",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Use a low-light interface.",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device setting.",
    icon: Monitor,
  },
] as const;

const AUTO_TERMINATE_MIN_MINUTES = 15;
const AUTO_TERMINATE_MAX_MINUTES = 1200;

export default function ClientView() {
  const { theme = "system", setTheme } = useTheme();
  const {
    data: userSettings,
    isLoading: isUserSettingsLoading,
    isError: isUserSettingsError,
  } = useUserSettings();
  const { data: sshKeys, isLoading } = useSshKeys();
  const deleteSshKeyMutation = useDeleteSshKey();
  const updateUserSettingsMutation = useUpdateUserSettings();
  const [isEditingModels, setIsEditingModels] = useState(false);
  const [isEditingInstanceTermination, setIsEditingInstanceTermination] =
    useState(false);
  const [modelForm, setModelForm] = useState({
    defaultPrModel: "",
    defaultIssueFixerModel: "",
    defaultCommentModel: "",
  });
  const [instanceTerminationForm, setInstanceTerminationForm] = useState({
    defaultIssueInstanceAutoTerminateAfterMinutes: "",
    defaultPrInstanceAutoTerminateAfterMinutes: "",
    defaultManualInstanceAutoTerminateAfterMinutes: "",
  });

  useEffect(() => {
    if (!userSettings || isEditingModels) return;

    setModelForm({
      defaultPrModel: userSettings.default_pr_model ?? "",
      defaultIssueFixerModel: userSettings.default_issue_fixer_model ?? "",
      defaultCommentModel: userSettings.default_comment_model ?? "",
    });
  }, [isEditingModels, userSettings]);

  useEffect(() => {
    if (!userSettings || isEditingInstanceTermination) return;

    setInstanceTerminationForm({
      defaultIssueInstanceAutoTerminateAfterMinutes:
        userSettings.default_issue_instance_auto_terminate_after_minutes.toString(),
      defaultPrInstanceAutoTerminateAfterMinutes:
        userSettings.default_pr_instance_auto_terminate_after_minutes.toString(),
      defaultManualInstanceAutoTerminateAfterMinutes:
        userSettings.default_manual_instance_auto_terminate_after_minutes.toString(),
    });
  }, [isEditingInstanceTermination, userSettings]);

  const modelSettings = [
    {
      label: "Default PR model",
      name: "defaultPrModel",
      value: userSettings?.default_pr_model,
    },
    {
      label: "Default issue fixer model",
      name: "defaultIssueFixerModel",
      value: userSettings?.default_issue_fixer_model,
    },
    {
      label: "Default comment model",
      name: "defaultCommentModel",
      value: userSettings?.default_comment_model,
    },
  ] as const;

  const instanceTerminationSettings = [
    {
      label: "Issue instances",
      name: "defaultIssueInstanceAutoTerminateAfterMinutes",
      value:
        userSettings?.default_issue_instance_auto_terminate_after_minutes,
    },
    {
      label: "PR instances",
      name: "defaultPrInstanceAutoTerminateAfterMinutes",
      value: userSettings?.default_pr_instance_auto_terminate_after_minutes,
    },
    {
      label: "Manual instances",
      name: "defaultManualInstanceAutoTerminateAfterMinutes",
      value:
        userSettings?.default_manual_instance_auto_terminate_after_minutes,
    },
  ] as const;

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting SSH key");
    try {
      await deleteSshKeyMutation.mutateAsync(id);
      toast.success("SSH key deleted", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete SSH key", { id: toastId });
    }
  };

  const handleEditModels = () => {
    if (!userSettings) return;

    setModelForm({
      defaultPrModel: userSettings.default_pr_model ?? "",
      defaultIssueFixerModel: userSettings.default_issue_fixer_model ?? "",
      defaultCommentModel: userSettings.default_comment_model ?? "",
    });
    setIsEditingModels(true);
  };

  const handleCancelEditModels = () => {
    if (userSettings) {
      setModelForm({
        defaultPrModel: userSettings.default_pr_model ?? "",
        defaultIssueFixerModel: userSettings.default_issue_fixer_model ?? "",
        defaultCommentModel: userSettings.default_comment_model ?? "",
      });
    }
    setIsEditingModels(false);
  };

  const handleSaveModels = async () => {
    const toastId = toast.loading("Saving default models");

    try {
      await updateUserSettingsMutation.mutateAsync(modelForm);
      setIsEditingModels(false);
      toast.success("Default models saved", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save default models", { id: toastId });
    }
  };

  const handleEditInstanceTermination = () => {
    if (!userSettings) return;

    setInstanceTerminationForm({
      defaultIssueInstanceAutoTerminateAfterMinutes:
        userSettings.default_issue_instance_auto_terminate_after_minutes.toString(),
      defaultPrInstanceAutoTerminateAfterMinutes:
        userSettings.default_pr_instance_auto_terminate_after_minutes.toString(),
      defaultManualInstanceAutoTerminateAfterMinutes:
        userSettings.default_manual_instance_auto_terminate_after_minutes.toString(),
    });
    setIsEditingInstanceTermination(true);
  };

  const handleCancelEditInstanceTermination = () => {
    if (userSettings) {
      setInstanceTerminationForm({
        defaultIssueInstanceAutoTerminateAfterMinutes:
          userSettings.default_issue_instance_auto_terminate_after_minutes.toString(),
        defaultPrInstanceAutoTerminateAfterMinutes:
          userSettings.default_pr_instance_auto_terminate_after_minutes.toString(),
        defaultManualInstanceAutoTerminateAfterMinutes:
          userSettings.default_manual_instance_auto_terminate_after_minutes.toString(),
      });
    }
    setIsEditingInstanceTermination(false);
  };

  const handleSaveInstanceTermination = async () => {
    const parsedForm = {
      defaultIssueInstanceAutoTerminateAfterMinutes: Number(
        instanceTerminationForm.defaultIssueInstanceAutoTerminateAfterMinutes,
      ),
      defaultPrInstanceAutoTerminateAfterMinutes: Number(
        instanceTerminationForm.defaultPrInstanceAutoTerminateAfterMinutes,
      ),
      defaultManualInstanceAutoTerminateAfterMinutes: Number(
        instanceTerminationForm.defaultManualInstanceAutoTerminateAfterMinutes,
      ),
    };

    const hasInvalidValue = Object.values(parsedForm).some(
      (value) =>
        !Number.isInteger(value) ||
        value < AUTO_TERMINATE_MIN_MINUTES ||
        value > AUTO_TERMINATE_MAX_MINUTES,
    );

    if (hasInvalidValue) {
      toast.error(
        "Auto-termination values must be whole minutes from 15 to 1200",
      );
      return;
    }

    const toastId = toast.loading("Saving auto-termination settings");

    try {
      await updateUserSettingsMutation.mutateAsync(parsedForm);
      setIsEditingInstanceTermination(false);
      toast.success("Auto-termination settings saved", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to save auto-termination settings", { id: toastId });
    }
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <div className="mt-8">
        <section>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setTheme(option.value)}
                  className="border-input bg-background hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:bg-primary/5 dark:aria-pressed:bg-primary/10 flex min-h-28 rounded-lg border p-4 text-left transition-colors outline-none focus-visible:ring-3"
                >
                  <span className="flex w-full flex-col gap-4">
                    <span className="flex items-start justify-between gap-3">
                      <span className="bg-muted text-foreground flex size-9 items-center justify-center rounded-lg">
                        <Icon className="h-4 w-4" />
                      </span>
                      {isSelected ? (
                        <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </span>
                    <span>
                      <span className="block font-medium">{option.label}</span>
                      <span className="text-muted-foreground mt-1 block text-sm">
                        {option.description}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Default models</h2>
            {userSettings ? (
              isEditingModels ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cancel editing default models"
                    onClick={handleCancelEditModels}
                    disabled={updateUserSettingsMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveModels}
                    disabled={updateUserSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit default models"
                  onClick={handleEditModels}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border">
            {isUserSettingsLoading ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="grid gap-2 p-4 sm:grid-cols-[220px_1fr] sm:items-center"
                  >
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                ))}
              </div>
            ) : isUserSettingsError ? (
              <div className="text-muted-foreground p-6 text-sm">
                Failed to load user settings.
              </div>
            ) : userSettings ? (
              <div className="divide-y">
                {modelSettings.map((setting) => (
                  <div
                    key={setting.label}
                    className="grid gap-1 p-4 sm:grid-cols-[220px_1fr] sm:items-center"
                  >
                    <div className="text-muted-foreground text-sm">
                      {setting.label}
                    </div>
                    {isEditingModels ? (
                      <Input
                        value={modelForm[setting.name]}
                        onChange={(event) =>
                          setModelForm((current) => ({
                            ...current,
                            [setting.name]: event.target.value,
                          }))
                        }
                        disabled={updateUserSettingsMutation.isPending}
                        aria-label={setting.label}
                      />
                    ) : (
                      <div className="font-medium">
                        {setting.value?.trim() || "Not configured"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground p-6 text-sm">
                No user settings found.
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Instance auto-termination
            </h2>
            {userSettings ? (
              isEditingInstanceTermination ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Cancel editing instance auto-termination"
                    onClick={handleCancelEditInstanceTermination}
                    disabled={updateUserSettingsMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveInstanceTermination}
                    disabled={updateUserSettingsMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit instance auto-termination"
                  onClick={handleEditInstanceTermination}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border">
            {isUserSettingsLoading ? (
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="grid gap-2 p-4 sm:grid-cols-[220px_1fr] sm:items-center"
                  >
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : isUserSettingsError ? (
              <div className="text-muted-foreground p-6 text-sm">
                Failed to load user settings.
              </div>
            ) : userSettings ? (
              <div className="divide-y">
                {instanceTerminationSettings.map((setting) => (
                  <div
                    key={setting.label}
                    className="grid gap-1 p-4 sm:grid-cols-[220px_1fr] sm:items-center"
                  >
                    <div className="text-muted-foreground text-sm">
                      {setting.label}
                    </div>
                    {isEditingInstanceTermination ? (
                      <Input
                        type="number"
                        min={AUTO_TERMINATE_MIN_MINUTES}
                        max={AUTO_TERMINATE_MAX_MINUTES}
                        step={1}
                        value={instanceTerminationForm[setting.name]}
                        onChange={(event) =>
                          setInstanceTerminationForm((current) => ({
                            ...current,
                            [setting.name]: event.target.value,
                          }))
                        }
                        disabled={updateUserSettingsMutation.isPending}
                        aria-label={`${setting.label} auto-termination minutes`}
                      />
                    ) : (
                      <div className="font-medium">
                        {setting.value} minutes
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground p-6 text-sm">
                No user settings found.
              </div>
            )}
          </div>
        </section>

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold">SSH keys</h2>
          <CreateSshKeyDialog />
        </div>

        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">S.No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                [1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-6" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Skeleton className="h-9 w-9" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : sshKeys && sshKeys.length > 0 ? (
                sshKeys.map((sshKey, index) => (
                  <TableRow key={sshKey.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="font-medium">{sshKey.name}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <EditSshKeyDialog
                          sshKeyId={sshKey.id}
                          sshKeyName={sshKey.name}
                          initialValue={sshKey.value}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Edit SSH key"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </EditSshKeyDialog>
                        <ConfirmationDialog
                          title="Delete SSH Key"
                          description="Are you sure you want to delete this SSH key? This action cannot be undone."
                          confirmText="Delete"
                          isDestructive
                          onConfirm={() => handleDelete(sshKey.id)}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Delete SSH key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ConfirmationDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-32 text-center">
                    <div className="text-muted-foreground">
                      <Key className="mx-auto mb-3 h-8 w-8 opacity-50" />
                      <p>No SSH keys found.</p>
                      <p className="text-sm">
                        Add a new SSH key to get started.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
