"use client";

import { useDeleteSshKey, useSshKeys } from "@/hooks/use-ssh-keys";
import { CreateSshKeyDialog } from "@/components/dialogs/create-ssh-key-dialog";
import { EditSshKeyDialog } from "@/components/dialogs/edit-ssh-key-dialog";
import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { Key, Pencil, Trash2 } from "lucide-react";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Button } from "@repo/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
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
