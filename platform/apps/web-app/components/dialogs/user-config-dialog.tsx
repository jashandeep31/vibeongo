"use client";

import {
  useCreateUserConfig,
  useUpdateUserConfig,
  useUserConfig,
} from "@repo/api-hooks";
import type { UserConfigValue } from "@repo/api-client";
import type { userConfigs } from "@repo/db";
import { opencodeCredentialsValidator } from "@repo/shared";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type UserConfigType = (typeof userConfigs.$inferSelect)["config_type"];

// OpenCode takes the `opencode auth export` array, the other tools a JSON object
const emptyConfigText = (configType: UserConfigType) =>
  configType === "opencode" ? "[]" : "{}";

const validateUserConfig = (
  configType: UserConfigType,
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

type UserConfigDialogProps = {
  configType: UserConfigType;
  name: string;
  isConfigured: boolean;
};

export function UserConfigDialog({
  configType,
  name,
  isConfigured,
}: UserConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [configText, setConfigText] = useState(emptyConfigText(configType));
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const configQuery = useUserConfig(configType, open);
  const createMutation = useCreateUserConfig();
  const updateMutation = useUpdateUserConfig();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open || !configQuery.isSuccess) return;
    const config = configQuery.data?.config;
    setConfigText(
      config ? JSON.stringify(config, null, 2) : emptyConfigText(configType),
    );
  }, [configQuery.data, configQuery.isSuccess, configType, open]);

  const clearConfig = () => {
    setConfigText(emptyConfigText(configType));
    setValidationError(null);
    queryClient.removeQueries({
      queryKey: ["user-config", configType],
      exact: true,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSaving) return;
    setOpen(nextOpen);
    if (!nextOpen) clearConfig();
  };

  const handleSave = async () => {
    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configText);
    } catch {
      setValidationError("Enter valid JSON before saving.");
      return;
    }

    const configError = validateUserConfig(configType, parsedConfig);
    if (configError) {
      setValidationError(configError);
      return;
    }

    setValidationError(null);
    try {
      const config = parsedConfig as UserConfigValue;
      if (isConfigured) {
        await updateMutation.mutateAsync({ configType, config });
      } else {
        await createMutation.mutateAsync({ configType, config });
      }
      setOpen(false);
      clearConfig();
      toast.success(`${name} configuration saved`);
    } catch {
      toast.error(`Failed to save ${name} configuration`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={isConfigured ? "outline" : "default"}
        >
          {isConfigured ? "Edit" : "Configure"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isConfigured ? "Edit" : "Configure"} {name}
          </DialogTitle>
          <DialogDescription>
            This sensitive configuration is decrypted only while this dialog is
            open and encrypted again when saved.
          </DialogDescription>
        </DialogHeader>

        {configQuery.isLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : configQuery.isError ? (
          <p className="text-destructive rounded-xl border p-4 text-sm">
            Failed to load the configuration.
          </p>
        ) : (
          <div className="grid gap-2">
            <label
              htmlFor={`${configType}-config`}
              className="text-sm font-medium"
            >
              Configuration JSON
            </label>
            <Textarea
              id={`${configType}-config`}
              value={configText}
              onChange={(event) => {
                setConfigText(event.target.value);
                setValidationError(null);
              }}
              className="h-64 resize-none font-mono text-xs"
              placeholder='{"token": "..."}'
              spellCheck={false}
              aria-invalid={Boolean(validationError)}
            />
            {validationError ? (
              <p className="text-destructive text-sm">{validationError}</p>
            ) : null}
          </div>
        )}

        <DialogFooter showCloseButton>
          <Button
            type="button"
            onClick={handleSave}
            disabled={configQuery.isLoading || configQuery.isError || isSaving}
          >
            {isSaving ? "Saving..." : "Save configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
