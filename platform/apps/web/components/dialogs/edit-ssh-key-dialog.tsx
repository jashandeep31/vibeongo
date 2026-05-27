"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useUpdateSshKey } from "@/hooks/use-ssh-keys";
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
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "@repo/shared";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const updateSshKeySchema = z.object({
  value: z.string().min(1, "SSH public key is required").max(300),
});

interface EditSshKeyDialogProps {
  sshKeyId: string;
  sshKeyName: string;
  initialValue: string;
  children: ReactNode;
}

export function EditSshKeyDialog({
  sshKeyId,
  sshKeyName,
  initialValue,
  children,
}: EditSshKeyDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useUpdateSshKey();

  const form = useForm<z.infer<typeof updateSshKeySchema>>({
    resolver: zodResolver(updateSshKeySchema),
    defaultValues: {
      value: initialValue,
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      form.reset({ value: initialValue });
    }
  };

  const onSubmit = async (data: z.infer<typeof updateSshKeySchema>) => {
    const toastId = toast.loading("Updating SSH key");

    try {
      await mutateAsync({
        id: sshKeyId,
        value: data.value,
      });
      setOpen(false);
      toast.success("SSH key updated", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update SSH key", { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit SSH Key</DialogTitle>
          <DialogDescription>
            Update the public key for {sshKeyName}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <Controller
              name="value"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>SSH public key</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Updating..." : "Update SSH Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
