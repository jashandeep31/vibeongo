"use client";

import { useState } from "react";
import { useCreateSshKey } from "@/hooks/use-ssh-keys";
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
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z, createSshKeySchema } from "@repo/shared";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { toast } from "sonner";

export function CreateSshKeyDialog() {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useCreateSshKey();

  const form = useForm<z.infer<typeof createSshKeySchema>>({
    resolver: zodResolver(createSshKeySchema),
    defaultValues: {
      name: "",
      value: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof createSshKeySchema>) => {
    const toastId = toast.loading("Adding SSH key");
    try {
      await mutateAsync(data);
      form.reset();
      setOpen(false);
      toast.success("Adding SSH key", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to create SSH key", { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Ssh Key</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add SSH Key</DialogTitle>
          <DialogDescription>
            Add a new SSH key to your account to securely connect.
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
                    placeholder="e.g. My MacBook"
                    autoComplete="off"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
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
              {isPending ? "Saving..." : "Save SSH Key"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
