"use client";
import React from "react";
import { useSshKeys } from "@/hooks/use-ssh-keys";
import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";
import { useConfigStore } from "@/store/config-store";

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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="text-muted-foreground bg-card animate-pulse rounded-lg border p-4 text-sm">
          Loading SSH keys...
        </div>
      </div>
    );
  }

  if (!sshKeys || sshKeys.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-muted-foreground text-sm">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="text-muted-foreground bg-muted/50 rounded-lg border p-4 text-sm">
          No SSH keys found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-sm">SSH Keys</Label>
        <CreateSshKeyDialog />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sshKeys.map((sshKey) => {
          const isSelected = selectedKeys.includes(sshKey.id);
          return (
            <button
              type="button"
              key={sshKey.id}
              onClick={() => toggleKey(sshKey.id)}
              className={`hover:bg-muted/50 flex items-center space-x-3 rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5 ring-primary ring-1"
                  : "bg-card border-border"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleKey(sshKey.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${sshKey.name}`}
              />
              <div
                className={`truncate text-sm font-medium ${
                  isSelected ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {sshKey.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

SshKeysCard.displayName = "SshKeysCard";
export default SshKeysCard;
