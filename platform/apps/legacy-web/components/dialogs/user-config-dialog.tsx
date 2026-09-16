"use client";

import { useEffect, useState } from "react";
import {
  useCreateUserConfig,
  useUpdateUserConfig,
  useUserConfig,
} from "@/hooks/use-user";
import type { UserConfigType, UserConfigValue } from "@/services/user-services";
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
import { toast } from "sonner";

export type UserConfigDialogProps = {
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
  const [configText, setConfigText] = useState("{}");
  const [validationError, setValidationError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const configQuery = useUserConfig(configType, open);
  const createMutation = useCreateUserConfig();
  const updateMutation = useUpdateUserConfig();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!open || !configQuery.isSuccess) return;
    setConfigText(JSON.stringify(configQuery.data?.config ?? {}, null, 2));
  }, [configQuery.data, configQuery.isSuccess, open]);

  const clearDecryptedConfig = () => {
    setConfigText("{}");
    setValidationError(null);
    queryClient.removeQueries({
      queryKey: ["user-config", configType],
      exact: true,
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) clearDecryptedConfig();
  };

  const handleSave = async () => {
    let parsedConfig: unknown;

    try {
      parsedConfig = JSON.parse(configText);
    } catch {
      setValidationError("Enter valid JSON before saving.");
      return;
    }

    if (
      parsedConfig === null ||
      typeof parsedConfig !== "object" ||
      Array.isArray(parsedConfig)
    ) {
      setValidationError("The configuration must be a JSON object.");
      return;
    }

    setValidationError(null);
    const toastId = toast.loading(`Saving ${name} configuration`);

    try {
      const config = parsedConfig as UserConfigValue;
      if (isConfigured) {
        await updateMutation.mutateAsync({ configType, config });
      } else {
        await createMutation.mutateAsync({ configType, config });
      }

      setOpen(false);
      clearDecryptedConfig();
      toast.success(`${name} configuration saved`, { id: toastId });
    } catch {
      toast.error(`Failed to save ${name} configuration`, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className="mt-5 w-full"
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
            This sensitive configuration is decrypted only after this dialog is
            opened and is encrypted again when you save it.
          </DialogDescription>
        </DialogHeader>

        {configQuery.isLoading ? (
          <Skeleton className="h-80 w-full" />
        ) : configQuery.isError ? (
          <div className="text-destructive rounded-md border p-4 text-sm">
            Failed to load the configuration. Close the dialog and try again.
          </div>
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
              className="h-64 max-h-64 resize-none overflow-y-auto font-mono text-xs"
              placeholder='{"token": "..."}'
              autoComplete="off"
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
