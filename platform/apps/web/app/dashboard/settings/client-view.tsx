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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-muted-foreground">
            SSH keys
          </h2>
          <CreateSshKeyDialog />
        </div>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[300px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : sshKeys && sshKeys.length > 0 ? (
            sshKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Key className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{key.name}</h3>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-md md:max-w-lg lg:max-w-xl">
                      {key.value}
                    </p>
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
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </ConfirmationDialog>
              </div>
            ))
          ) : (
            <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
              <Key className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p>No SSH keys found.</p>
              <p className="text-sm">Add a new SSH key to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
