"use client";

import { useSshKeys, useDeleteSshKey } from "@/hooks/use-ssh-keys";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Key, Trash2 } from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import { toast } from "sonner";

export default function ClientView() {
  const { data: sshKeys, isLoading } = useSshKeys();
  const deleteSshKeyMutation = useDeleteSshKey();

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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-lg font-semibold">
            SSH keys
          </h2>
          <CreateSshKeyDialog />
        </div>

        <div className="mt-6 grid gap-4 space-y-4 md:grid-cols-2">
          {isLoading ? (
            <>
              {[1].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border px-2 py-2"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[300px]" />
                  </div>
                </div>
              ))}
            </>
          ) : sshKeys && sshKeys.length > 0 ? (
            sshKeys.map((key) => (
              <div
                key={key.id}
                className="bg-card flex h-full items-center justify-between rounded-lg border px-2"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 rounded-full p-2">
                    <Key className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium">{key.name}</h3>
                  </div>
                </div>
                <ConfirmationDialog
                  title="Delete SSH Key"
                  description="Are you sure you want to delete this SSH key? This action cannot be undone."
                  confirmText="Delete"
                  isDestructive
                  onConfirm={() => handleDelete(key.id)}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </ConfirmationDialog>
              </div>
            ))
          ) : (
            <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
              <Key className="mx-auto mb-3 h-8 w-8 opacity-50" />
              <p>No SSH keys found.</p>
              <p className="text-sm">Add a new SSH key to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
