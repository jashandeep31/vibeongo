"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { useApiKeys, useCreateApiKey, useDeleteApiKey } from "@repo/api-hooks";
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
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  Plus,
  Trash2,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 10;

function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const createApiKey = useCreateApiKey();

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && createApiKey.isPending) return;
    setOpen(nextOpen);
    if (!nextOpen) {
      setName("");
      setCreatedKey(null);
      createApiKey.reset();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) return;

    try {
      const result = await createApiKey.mutateAsync({ name: name.trim() });
      setCreatedKey(result.data.key);
      toast.success("API key created");
    } catch {
      toast.error("Failed to create API key");
    }
  };

  const copyKey = async () => {
    if (!createdKey) return;
    try {
      await navigator.clipboard.writeText(createdKey);
      toast.success("API key copied");
    } catch {
      toast.error("Failed to copy API key");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus /> Create key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "Your new API key" : "Create API key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Copy this key now. You will not be able to see it again."
              : "Give this key a name so you can identify it later."}
          </DialogDescription>
        </DialogHeader>
        {createdKey ? (
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Input
                aria-label="New API key"
                value={createdKey}
                readOnly
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyKey()}
              >
                <Copy /> Copy
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="grid gap-5"
          >
            <div className="grid gap-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. My laptop"
                maxLength={255}
                required
                disabled={createApiKey.isPending}
              />
            </div>
            <DialogFooter showCloseButton>
              <Button
                type="submit"
                disabled={!name.trim() || createApiKey.isPending}
              >
                {createApiKey.isPending ? "Creating..." : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysSettings() {
  const [page, setPage] = useState(1);
  const apiKeysQuery = useApiKeys({ page, limit: PAGE_SIZE });
  const deleteApiKey = useDeleteApiKey();
  const keys = apiKeysQuery.data?.data ?? [];

  const handleRevoke = async (id: string) => {
    try {
      await deleteApiKey.mutateAsync(id);
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    }
  };

  return (
    <section className="py-3 md:py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <KeyRound className="text-muted-foreground mt-1 size-4 shrink-0" />
          <div>
            <h2 className="font-semibold">API keys</h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Create keys for the CLI and revoke ones you no longer use.
            </p>
          </div>
        </div>
        <CreateApiKeyDialog />
      </div>
      <div className="mt-7 pl-0 md:pl-8">
        {apiKeysQuery.isLoading ? (
          <div className="grid gap-2">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : apiKeysQuery.isError ? (
          <p className="text-destructive text-sm">Failed to load API keys.</p>
        ) : keys.length ? (
          <div className="space-y-3">
            {keys.map((key) => {
              const expired =
                key.expires_at !== null &&
                new Date(key.expires_at).getTime() <= Date.now();
              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{key.name}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Created {key.created_at.slice(0, 10)}
                      {key.last_used_at
                        ? ` · Last used ${key.last_used_at.slice(0, 10)}`
                        : " · Never used"}
                      {key.expires_at
                        ? ` · Expires ${key.expires_at.slice(0, 10)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {key.revoked_at
                        ? "Revoked"
                        : expired
                          ? "Expired"
                          : "Active"}
                    </span>
                    {!key.revoked_at ? (
                      <ConfirmationDialog
                        title="Revoke API key?"
                        description={`Revoke ${key.name}. Apps using this key will lose access.`}
                        confirmText="Revoke"
                        isDestructive
                        onConfirm={() => void handleRevoke(key.id)}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive hover:text-destructive"
                          aria-label={`Revoke ${key.name}`}
                          disabled={deleteApiKey.isPending}
                        >
                          <Trash2 />
                        </Button>
                      </ConfirmationDialog>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground py-12 text-center text-sm">
            <KeyRound className="mx-auto mb-3 size-7 opacity-50" />
            No API keys created.
          </div>
        )}
        <div className="mt-5 flex items-center justify-end gap-2">
          <span className="text-muted-foreground mr-2 text-xs">
            Page {page}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current - 1)}
            disabled={page === 1 || apiKeysQuery.isFetching}
          >
            <ChevronLeft /> Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={!apiKeysQuery.data?.hasNext || apiKeysQuery.isFetching}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>
    </section>
  );
}
