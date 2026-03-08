"use client";

import { useSshKeys } from "@/hooks/use-ssh-keys";
import { Label } from "@repo/ui/components/label";
import { Checkbox } from "@repo/ui/components/checkbox";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";

interface SshKeysCardProps {
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
}

export default function SshKeysCard({
  selectedKeys,
  onSelectedKeysChange,
}: SshKeysCardProps) {
  const { data: sshKeys, isLoading } = useSshKeys();

  const toggleKey = (value: string) => {
    onSelectedKeysChange(
      selectedKeys.includes(value)
        ? selectedKeys.filter((k) => k !== value)
        : [...selectedKeys, value],
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="text-sm text-muted-foreground animate-pulse border rounded-lg p-4 bg-card">
          Loading SSH keys...
        </div>
      </div>
    );
  }

  if (!sshKeys || sshKeys.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm text-muted-foreground">SSH Keys</Label>
          <CreateSshKeyDialog />
        </div>
        <div className="text-sm text-muted-foreground border rounded-lg p-4 bg-muted/50">
          No SSH keys found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-muted-foreground">SSH Keys</Label>
        <CreateSshKeyDialog />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sshKeys.map((sshKey) => {
          const isSelected = selectedKeys.includes(sshKey.value);
          return (
            <button
              type="button"
              key={sshKey.id}
              onClick={() => toggleKey(sshKey.value)}
              className={`flex items-center space-x-3 text-left border rounded-lg p-3 transition-colors hover:bg-muted/50 ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card border-border"
              }`}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleKey(sshKey.value)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select ${sshKey.name}`}
              />
              <div
                className={`font-medium text-sm truncate ${
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
}
