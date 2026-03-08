"use client";

import { createSshKey } from "@/services/shh-services";
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
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z, createSshKeySchema } from "@repo/shared";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";

export function CreateSshKeyDialog() {
  // useMutation({
  //   mutationFn: createSshKey(),
  // });
  const form = useForm<z.infer<typeof createSshKeySchema>>({
    resolver: zodResolver(createSshKeySchema),
  });

  const onSubmit = () => {};

  return (
    <Dialog>
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
                  placeholder=""
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
                  placeholder=""
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
          <Button type="submit">Save SSH Key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
