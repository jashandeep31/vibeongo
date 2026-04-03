"use client";

import { useState } from "react";
import { useCreateGithubRepo } from "@/hooks/use-github-repos";
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
import { createGithubRepoSchema, z } from "@repo/shared";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";

export function CreateGithubRepoDialog() {
  const [open, setOpen] = useState(false);
  const { mutateAsync, isPending } = useCreateGithubRepo();

  const form = useForm<z.infer<typeof createGithubRepoSchema>>({
    resolver: zodResolver(createGithubRepoSchema),
    defaultValues: {
      url: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof createGithubRepoSchema>) => {
    const toastId = toast.loading("Adding GitHub repository...");
    try {
      await mutateAsync(data);
      form.reset();
      setOpen(false);
      toast.success("GitHub repository added successfully", { id: toastId });
    } catch (error: any) {
      console.error(error);
      const message =
        error?.response?.data?.message ||
        "Failed to add GitHub repository. Make sure you are the owner and have granted access.";
      toast.error(message, { id: toastId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Repository
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add GitHub Repository</DialogTitle>
          <DialogDescription>
            Enter the URL of your GitHub repository to connect it. Note that the
            platform's GitHub App must have access to it, and you must be the
            owner.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <Controller
              name="url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Repository URL</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="https://github.com/username/repository"
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
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding..." : "Add Repository"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
