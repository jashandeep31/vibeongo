"use client";

import { useCreateSshKey, useUpdateSshKey } from "@/hooks/use-ssh-keys";
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
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import type { sshKeys } from "@repo/db";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

type SshKeyDialogProps = {
  children: ReactNode;
  sshKey?: Pick<typeof sshKeys.$inferSelect, "id" | "name" | "value">;
};

export function SshKeyDialog({ children, sshKey }: SshKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(sshKey?.name ?? "");
  const [value, setValue] = useState(sshKey?.value ?? "");
  const createMutation = useCreateSshKey();
  const updateMutation = useUpdateSshKey();
  const isEditing = Boolean(sshKey);
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    setOpen(nextOpen);
    if (nextOpen) {
      setName(sshKey?.name ?? "");
      setValue(sshKey?.value ?? "");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim() || (!isEditing && !name.trim())) return;

    try {
      if (sshKey) {
        await updateMutation.mutateAsync({
          id: sshKey.id,
          value: value.trim(),
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          value: value.trim(),
        });
      }
      setOpen(false);
      toast.success(isEditing ? "SSH key updated" : "SSH key added");
    } catch {
      toast.error(
        isEditing ? "Failed to update SSH key" : "Failed to add SSH key",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit SSH key" : "Add SSH key"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update the public key for ${sshKey?.name}.`
              : "Add a public key for secure access to your workspaces."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-5">
          {!isEditing ? (
            <div className="grid gap-2">
              <Label htmlFor="ssh-key-name">Name</Label>
              <Input
                id="ssh-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. My MacBook"
                disabled={isPending}
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="ssh-key-value">SSH public key</Label>
            <Input
              id="ssh-key-value"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="ssh-ed25519 AAAAC3..."
              disabled={isPending}
            />
          </div>
          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={
                isPending || !value.trim() || (!isEditing && !name.trim())
              }
            >
              {isPending ? "Saving..." : "Save SSH key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
