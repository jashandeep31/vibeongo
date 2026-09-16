"use client";

import { useState, type ReactNode } from "react";
import { useRenameChat } from "@/hooks/use-chats";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { z } from "@repo/shared";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

const renameChatSchema = z.object({
  name: z.string().trim().min(1, "Chat name is required").max(30),
});

type RenameChatForm = z.infer<typeof renameChatSchema>;

type RenameChatDialogProps = {
  chatId: string;
  currentName: string;
  children: ReactNode;
};

export function RenameChatDialog({
  chatId,
  currentName,
  children,
}: RenameChatDialogProps) {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useRenameChat();

  const form = useForm<RenameChatForm>({
    resolver: zodResolver(renameChatSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (nextOpen) {
      form.reset({ name: currentName });
    }
  };

  const onSubmit = async (data: RenameChatForm) => {
    const toastId = toast.loading("Renaming chat");

    try {
      await mutateAsync({
        chatId,
        name: data.name,
      });
      setOpen(false);
      toast.success("Chat renamed", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to rename chat", { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat</DialogTitle>
          <DialogDescription>
            Update the name shown for this chat.
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
                    placeholder="Chat name"
                    autoComplete="off"
                    disabled={isPending}
                  />
                  {fieldState.invalid ? (
                    <FieldError errors={[fieldState.error]} />
                  ) : null}
                </Field>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Renaming..." : "Rename Chat"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
