"use client";
import React from "react";
import { useSshKeys } from "@/hooks/use-ssh-keys";
import { Label } from "@repo/ui/components/label";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";
import { useConfigStore } from "@/store/config-store";
import { Check, KeyRound } from "lucide-react";

const SshKeysCard = React.memo(() => {
  const { data: sshKeys, isLoading } = useSshKeys();
  const { sshKeys: selectedKeys, setSshKeys } = useConfigStore();

  const toggleKey = (value: string) => {
    setSshKeys(
      selectedKeys.includes(value)
        ? selectedKeys.filter((k) => k !== value)
        : [...selectedKeys, value],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="flex flex-wrap gap-2">
          {[1, 2].map((index) => (
            <Skeleton key={index} className="h-9 w-36 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!sshKeys || sshKeys.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="text-muted-foreground py-2 text-sm">
          No SSH keys found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-sm">SSH Keys</Label>
        <CreateSshKeyDialog />
      </div>
      <div className="flex flex-wrap gap-2">
        {sshKeys.map((sshKey) => {
          const isSelected = selectedKeys.includes(sshKey.id);
          return (
            <Button
              type="button"
              variant="outline"
              key={sshKey.id}
              title={sshKey.name}
              aria-pressed={isSelected}
              onClick={() => toggleKey(sshKey.id)}
              className={`h-9 max-w-full justify-start gap-2 px-3 ${
                isSelected
                  ? "border-primary bg-primary/5 text-primary ring-primary/30 ring-2"
                  : ""
              }`}
            >
              <KeyRound className="size-4 shrink-0" />
              <span className="max-w-52 truncate">{sshKey.name}</span>
              {isSelected ? <Check className="ml-1 size-3.5 shrink-0" /> : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
});

SshKeysCard.displayName = "SshKeysCard";
export default SshKeysCard;
