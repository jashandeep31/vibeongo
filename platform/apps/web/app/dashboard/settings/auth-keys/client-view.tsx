"use client";

import { ConfirmationDialog } from "@/components/dialogs/confirmation-dialog";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import {
  useAuthTokens,
  useCreateAuthToken,
  useDeleteAuthToken,
} from "@/hooks/use-auth-tokens";
import { createAuthTokenSchema, z } from "@repo/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Controller, useForm } from "react-hook-form";
import {
  Copy,
  KeyRound,
  Plus,
  ShieldCheck,
  ShieldX,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type CreateAuthTokenInput = z.infer<typeof createAuthTokenSchema>;

export default function ClientView() {
  const { data: authTokens, isLoading } = useAuthTokens();
  const createAuthTokenMutation = useCreateAuthToken();
  const deleteAuthTokenMutation = useDeleteAuthToken();
  const [newCredentials, setNewCredentials] = useState<{
    api_key: string;
    api_secret: string;
  } | null>(null);

  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting auth key");

    try {
      await deleteAuthTokenMutation.mutateAsync(id);
      toast.success("Auth key deleted", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete auth key", { id: toastId });
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <SettingsNavigation />

      <div className="mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-lg font-semibold">
            Auth keys
          </h2>
          <CreateAuthKeyDialog
            isPending={createAuthTokenMutation.isPending}
            onCreate={async (data) => {
              const toastId = toast.loading("Creating auth key");

              try {
                const created = await createAuthTokenMutation.mutateAsync(data);
                setNewCredentials(created);
                toast.success("Auth key created", { id: toastId });
              } catch (error) {
                console.error(error);
                toast.error("Failed to create auth key", { id: toastId });
                throw error;
              }
            }}
          />
        </div>

        {newCredentials && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">New auth key created</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Save this secret now. You will not be able to view it again.
              </p>

              <div className="space-y-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    API Key
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background flex-1 rounded-md border px-3 py-2 text-xs sm:text-sm">
                      {newCredentials.api_key}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(newCredentials.api_key, "API key")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    API Secret
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="bg-background flex-1 rounded-md border px-3 py-2 text-xs sm:text-sm">
                      {newCredentials.api_secret}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(newCredentials.api_secret, "API secret")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : authTokens && authTokens.length > 0 ? (
          <div className="space-y-3">
            {authTokens.map((token) => {
              const isRevoked = Boolean(token.terminated_at);

              return (
                <Card key={token.id}>
                  <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-primary/10 rounded-full p-2">
                          <KeyRound className="text-primary h-4 w-4" />
                        </div>
                        <h3 className="font-medium">{token.name}</h3>
                        <Badge className="capitalize">{token.permission}</Badge>
                        <Badge
                          className={
                            isRevoked
                              ? "bg-destructive/15 text-destructive"
                              : "bg-emerald-500/15 text-emerald-700"
                          }
                        >
                          {isRevoked ? (
                            <span className="inline-flex items-center gap-1">
                              <ShieldX className="h-3 w-3" /> Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" /> Active
                            </span>
                          )}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground font-mono text-sm break-all">
                        {token.key_id}
                      </p>
                    </div>

                    <ConfirmationDialog
                      title="Delete auth key"
                      description="Are you sure you want to delete this auth key? This action cannot be undone."
                      confirmText="Delete"
                      isDestructive
                      onConfirm={() => handleDelete(token.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmationDialog>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-muted-foreground rounded-lg border border-dashed p-8 text-center">
            <KeyRound className="mx-auto mb-3 h-8 w-8 opacity-50" />
            <p>No auth keys found.</p>
            <p className="text-sm">
              Create an auth key to access APIs securely.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreateAuthKeyDialogProps {
  isPending: boolean;
  onCreate: (data: CreateAuthTokenInput) => Promise<void>;
}

function CreateAuthKeyDialog({
  isPending,
  onCreate,
}: CreateAuthKeyDialogProps) {
  const [open, setOpen] = useState(false);

  const form = useForm<CreateAuthTokenInput>({
    resolver: zodResolver(createAuthTokenSchema),
    defaultValues: {
      name: "",
      permission: "read",
    },
  });

  const onSubmit = async (data: CreateAuthTokenInput) => {
    await onCreate(data);
    form.reset({ name: "", permission: "read" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Create Auth Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create auth key</DialogTitle>
          <DialogDescription>
            Generate a key pair for API access. The secret is shown only once.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Production API"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="permission"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Permission</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value: "read" | "write") =>
                      field.onChange(value)
                    }
                  >
                    <SelectTrigger
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="read">Read</SelectItem>
                      <SelectItem value="write">Write</SelectItem>
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Auth Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
